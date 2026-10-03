import { directorEvents, openUpstream } from "./openai";
import type { DirectorEvent, DirectorMessage } from "./protocol";

/** Cloudflare Rate Limiting binding (see [[ratelimits]] in wrangler.toml). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

export interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  OPENAI_REASONING_EFFORT?: string;
  ALLOWED_ORIGINS?: string;
  /** Optional: absent in local dev, where the in-memory limiter alone applies. */
  DIRECTOR_LIMITER?: RateLimiter;
}

/** Visitor turns kept per request. Assistant turns are never forwarded (see parseMessages). */
const MAX_USER_TURNS = 4;
const MAX_CHARS = 1500;
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 5000;
const CLIENT_KEY_HEX_CHARS = 32;
const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

// In-memory and per isolate: a fallback layer behind the rate limit binding, not a hard guarantee.
const hits = new Map<string, number[]>();

function rateLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > MAX_TRACKED_CLIENTS) {
    for (const [key, times] of hits) if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(key);
  }
  return false;
}

function allowedOrigins(env: Env): string[] {
  const configured = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((o) => o.trim().replace(/\/$/, ""))
    .filter(Boolean);
  return [...configured, ...LOCAL_ORIGINS];
}

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  if (!origin || !allowedOrigins(env).includes(origin)) return {};
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-methods": "POST, GET, OPTIONS",
    "access-control-allow-headers": "content-type",
    "access-control-max-age": "86400",
    vary: "Origin",
  };
}

function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...cors },
  });
}

/**
 * The client may send its whole history, but only the visitor's own turns are trusted: an
 * `assistant` turn is client-supplied text that would be treated as the model's own words, so they
 * are dropped (the model still sees what the visitor asked before). The last turn must be the visitor's.
 */
function parseMessages(body: unknown): DirectorMessage[] | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const visitorTurns: DirectorMessage[] = [];
  let lastRole = "";
  for (const m of raw) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    lastRole = role;
    const text = content.slice(0, MAX_CHARS).trim();
    if (role === "user" && text) visitorTurns.push({ role, content: text });
  }
  if (lastRole !== "user" || visitorTurns.length === 0) return null;
  return visitorTurns.slice(-MAX_USER_TURNS);
}

/** Stable, non-reversible key for a client IP: raw addresses are never stored or logged. */
async function clientKey(ip: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(ip));
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
    .slice(0, CLIENT_KEY_HEX_CHARS);
}

async function isRateLimited(env: Env, key: string): Promise<boolean> {
  if (rateLimited(key)) return true;
  if (!env.DIRECTOR_LIMITER) return false;
  try {
    const { success } = await env.DIRECTOR_LIMITER.limit({ key });
    return !success;
  } catch (err) {
    // Fail open on the binding only: the in-memory layer above already ran.
    console.error("rate limit binding failed", err);
    return false;
  }
}

async function handleDirector(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  if (!env.OPENAI_API_KEY) return json({ error: "director_offline" }, 503, cors);

  // Every request on Cloudflare carries CF-Connecting-IP. Without it we cannot rate limit fairly
  // (a shared bucket would let one client lock out everyone), so refuse.
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return json({ error: "client_unidentified" }, 400, cors);
  if (await isRateLimited(env, await clientKey(ip))) {
    return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "600" });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413, cors);
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413, cors);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }
  const messages = parseMessages(parsed);
  if (!messages) return json({ error: "invalid_request" }, 400, cors);

  const upstream = await openUpstream(
    { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, reasoningEffort: env.OPENAI_REASONING_EFFORT ?? "" },
    messages,
  );
  if (!upstream) return json({ error: "upstream_error" }, 502, cors);

  const encoder = new TextEncoder();
  const line = (event: DirectorEvent) => encoder.encode(JSON.stringify(event) + "\n");
  const iterator = directorEvents(upstream);

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await iterator.next();
        if (done) {
          controller.enqueue(line({ type: "done" }));
          controller.close();
          return;
        }
        controller.enqueue(line(value));
      } catch (err) {
        console.error("director stream failed", err);
        controller.enqueue(line({ type: "error", message: "The Director lost the signal. Try again." }));
        controller.enqueue(line({ type: "done" }));
        controller.close();
      }
    },
    cancel() {
      void iterator.return(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson",
      "cache-control": "no-store",
      "x-accel-buffering": "no",
      ...cors,
    },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env);

    if (origin && Object.keys(cors).length === 0) return json({ error: "origin_not_allowed" }, 403, {});
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true, model: env.OPENAI_MODEL }, 200, cors);
    }
    if (url.pathname === "/director") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { ...cors, allow: "POST, OPTIONS" });
      // POST needs an Origin from the allow list: browsers always send one, so a missing header means a script.
      if (Object.keys(cors).length === 0) return json({ error: "origin_not_allowed" }, 403, {});
      return handleDirector(request, env, cors);
    }
    return json({ error: "not_found" }, 404, cors);
  },
};
