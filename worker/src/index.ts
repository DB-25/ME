import { directorEvents, openUpstream } from "./openai";
import type { DirectorEvent, DirectorMessage } from "./protocol";

export interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  OPENAI_REASONING_EFFORT?: string;
  ALLOWED_ORIGINS?: string;
}

const MAX_MESSAGES = 10;
const MAX_CHARS = 1500;
const MAX_BODY_BYTES = 64 * 1024;
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

// In-memory and per isolate: good enough to blunt abuse, not a hard guarantee.
const hits = new Map<string, number[]>();

function rateLimited(ip: string, now = Date.now()): boolean {
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) {
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

function parseMessages(body: unknown): DirectorMessage[] | null {
  if (typeof body !== "object" || body === null) return null;
  const raw = (body as { messages?: unknown }).messages;
  if (!Array.isArray(raw)) return null;
  const messages: DirectorMessage[] = [];
  for (const m of raw.slice(-MAX_MESSAGES)) {
    if (typeof m !== "object" || m === null) return null;
    const { role, content } = m as Record<string, unknown>;
    if ((role !== "user" && role !== "assistant") || typeof content !== "string") return null;
    const text = content.slice(0, MAX_CHARS).trim();
    if (text) messages.push({ role, content: text });
  }
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") return null;
  return messages;
}

async function handleDirector(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  if (!env.OPENAI_API_KEY) return json({ error: "director_offline" }, 503, cors);

  const ip = request.headers.get("cf-connecting-ip") ?? "unknown";
  if (rateLimited(ip)) return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "600" });

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
      return handleDirector(request, env, cors);
    }
    return json({ error: "not_found" }, 404, cors);
  },
};
