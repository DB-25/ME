import type { Env, WorkerContext } from "./env";
import { reserveDailyBudget } from "./budget";
import { clientKey, createRateLimiter, json } from "./http";
import { directorEvents, openUpstream } from "./openai";
import type { DirectorEvent, DirectorMessage } from "./protocol";
import { handleTts } from "./tts";

export type { Env, RateLimiter } from "./env";

/** Visitor turns kept per request. Assistant turns are never forwarded (see parseMessages). */
const MAX_USER_TURNS = 4;
/** Per visitor message, in UTF-8 bytes (not characters, so multibyte text cannot sneak past). */
const MAX_MESSAGE_BYTES = 1500;
const DEFAULT_DAILY_BUDGET = 300;
const MAX_BODY_BYTES = 16 * 1024;
const RATE_LIMIT = 15;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const LOCAL_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"];

const isDirectorRateLimited = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);
const encoder = new TextEncoder();
const byteLength = (text: string) => encoder.encode(text).length;

/** Cut `text` to at most `maxBytes` UTF-8 bytes without leaving a broken trailing character. */
function truncateBytes(text: string, maxBytes: number): string {
  if (byteLength(text) <= maxBytes) return text;
  return new TextDecoder().decode(encoder.encode(text).slice(0, maxBytes)).replace(/\uFFFD+$/, "");
}

function dailyBudget(env: Env): number {
  const n = Number(env.DIRECTOR_DAILY_BUDGET);
  return env.DIRECTOR_DAILY_BUDGET && Number.isFinite(n) ? Math.max(0, Math.floor(n)) : DEFAULT_DAILY_BUDGET;
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
    const text = truncateBytes(content, MAX_MESSAGE_BYTES).trim();
    if (role === "user" && text) visitorTurns.push({ role, content: text });
  }
  if (lastRole !== "user" || visitorTurns.length === 0) return null;
  return visitorTurns.slice(-MAX_USER_TURNS);
}

async function handleDirector(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  if (!env.OPENAI_API_KEY) return json({ error: "director_offline" }, 503, cors);

  // Every request on Cloudflare carries CF-Connecting-IP. Without it we cannot rate limit fairly
  // (a shared bucket would let one client lock out everyone), so refuse.
  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return json({ error: "client_unidentified" }, 400, cors);
  if (await isDirectorRateLimited(env.DIRECTOR_LIMITER, await clientKey(ip))) {
    return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "600" });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413, cors);
  const text = await request.text();
  if (byteLength(text) > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413, cors);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }
  const messages = parseMessages(parsed);
  if (!messages) return json({ error: "invalid_request" }, 400, cors);

  // Global spend cap: counted only for valid requests, before any paid upstream call. A store
  // failure fails closed so the client falls back to the scripted tour.
  try {
    if (!(await reserveDailyBudget(env, "director", dailyBudget(env), 1))) {
      return json({ error: "director_offline" }, 503, { ...cors, "retry-after": "3600" });
    }
  } catch (err) {
    console.error("director budget store failed", err);
    return json({ error: "director_offline" }, 503, cors);
  }

  const upstream = await openUpstream(
    { apiKey: env.OPENAI_API_KEY, model: env.OPENAI_MODEL, reasoningEffort: env.OPENAI_REASONING_EFFORT ?? "" },
    messages,
  );
  if (!upstream) return json({ error: "upstream_error" }, 502, cors);

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
        // Includes the upstream timeout (AbortSignal.timeout): close the stream cleanly either way.
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
  async fetch(request: Request, env: Env, ctx: WorkerContext): Promise<Response> {
    const url = new URL(request.url);
    const origin = request.headers.get("origin");
    const cors = corsHeaders(origin, env);

    if (origin && Object.keys(cors).length === 0) return json({ error: "origin_not_allowed" }, 403, {});
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    if (url.pathname === "/health" && request.method === "GET") {
      return json({ ok: true }, 200, cors);
    }
    if (url.pathname === "/director") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { ...cors, allow: "POST, OPTIONS" });
      // POST needs an Origin from the allow list: browsers always send one, so a missing header means a script.
      if (Object.keys(cors).length === 0) return json({ error: "origin_not_allowed" }, 403, {});
      return handleDirector(request, env, cors);
    }
    if (url.pathname === "/tts") {
      if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, { ...cors, allow: "POST, OPTIONS" });
      if (Object.keys(cors).length === 0) return json({ error: "origin_not_allowed" }, 403, {});
      return handleTts(request, env, ctx, cors);
    }
    return json({ error: "not_found" }, 404, cors);
  },
};
