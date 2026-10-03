import type { Env, WorkerContext } from "./env";
import { clientKey, createRateLimiter, json, sha256Hex } from "./http";

/**
 * Option B: runtime text to speech in DB's cloned voice (ElevenLabs). Off by default.
 * Enabled only with TTS_PROVIDER=elevenlabs plus the ELEVENLABS_API_KEY and ELEVENLABS_VOICE_ID
 * secrets. See docs/voice-plan.md.
 */

const MAX_TEXT_CHARS = 300;
const MAX_BODY_BYTES = 2048;
/** Every uncached request costs at least this many budget characters, so tiny texts cannot burn the KV write quota. */
const MIN_CHARGE = 20;
const DEFAULT_DAILY_BUDGET = 20000;
const DEFAULT_MODEL = "eleven_flash_v2_5";
const OUTPUT_FORMAT = "mp3_44100_96";
const ELEVENLABS_BASE = "https://api.elevenlabs.io/v1/text-to-speech";
const AUDIO_CACHE_TTL_S = 30 * 24 * 60 * 60;
const BUDGET_TTL_S = 2 * 24 * 60 * 60;
const VOICE_ID = /^[A-Za-z0-9]{8,40}$/;
const RATE_LIMIT = 40;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const isTtsRateLimited = createRateLimiter(RATE_LIMIT, RATE_WINDOW_MS);

type Cfg = { apiKey: string; voiceId: string; model: string; dailyBudget: number };

export function ttsConfig(env: Env): Cfg | null {
  if (env.TTS_PROVIDER !== "elevenlabs") return null;
  const apiKey = env.ELEVENLABS_API_KEY;
  const voiceId = env.ELEVENLABS_VOICE_ID;
  if (!apiKey || !voiceId || !VOICE_ID.test(voiceId)) return null;
  const budget = Number(env.TTS_DAILY_CHAR_BUDGET);
  return {
    apiKey,
    voiceId,
    model: env.TTS_MODEL || DEFAULT_MODEL,
    dailyBudget: env.TTS_DAILY_CHAR_BUDGET && Number.isFinite(budget) ? Math.max(0, Math.floor(budget)) : DEFAULT_DAILY_BUDGET,
  };
}

/** Validate the request body. Returns the normalized text, or null. */
export function parseTtsText(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const text = (body as { text?: unknown }).text;
  if (typeof text !== "string") return null;
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > MAX_TEXT_CHARS) return null;
  return normalized;
}

/* ---------- daily character budget ---------- */

const utcDay = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
const defaultCache = () => (caches as unknown as { default: Cache }).default;
const budgetCacheKey = (day: string) => new Request(`https://tts.budget.invalid/${day}`);

async function readUsed(env: Env, day: string): Promise<number> {
  if (env.TTS_KV) return Number(await env.TTS_KV.get(`tts-budget:${day}`)) || 0;
  const hit = await defaultCache().match(budgetCacheKey(day));
  return hit ? Number(await hit.text()) || 0 : 0;
}

async function writeUsed(env: Env, day: string, used: number): Promise<void> {
  if (env.TTS_KV) {
    await env.TTS_KV.put(`tts-budget:${day}`, String(used), { expirationTtl: BUDGET_TTL_S });
    return;
  }
  await defaultCache().put(
    budgetCacheKey(day),
    new Response(String(used), { headers: { "cache-control": `public, max-age=${BUDGET_TTL_S}` } }),
  );
}

/**
 * Reserve `chars` from today's budget. Returns false when it would exceed the budget.
 * KV (global, if bound) or the Cache API (per data center, best effort) holds the counter; the
 * read then write is not atomic, so concurrent requests can overshoot by a request or two.
 * Throws if the store fails: the caller fails closed.
 */
export async function reserveBudget(env: Env, budget: number, chars: number, now = Date.now()): Promise<boolean> {
  const day = utcDay(now);
  const used = await readUsed(env, day);
  if (used + chars > budget) return false;
  await writeUsed(env, day, used + chars);
  return true;
}

/* ---------- handler ---------- */

function audioResponse(body: BodyInit | null, cache: "hit" | "miss", cors: Record<string, string>): Response {
  return new Response(body, {
    headers: { "content-type": "audio/mpeg", "cache-control": "no-store", "x-tts-cache": cache, ...cors },
  });
}

export async function handleTts(
  request: Request,
  env: Env,
  ctx: WorkerContext,
  cors: Record<string, string>,
): Promise<Response> {
  const cfg = ttsConfig(env);
  if (!cfg) return json({ error: "tts_disabled" }, 404, cors);

  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return json({ error: "client_unidentified" }, 400, cors);
  if (await isTtsRateLimited(env.TTS_LIMITER, await clientKey(ip))) {
    return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "600" });
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413, cors);
  const raw = await request.text();
  if (raw.length > MAX_BODY_BYTES) return json({ error: "payload_too_large" }, 413, cors);
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: "invalid_json" }, 400, cors);
  }
  const text = parseTtsText(body);
  if (!text) return json({ error: "invalid_request", maxChars: MAX_TEXT_CHARS }, 400, cors);

  // Cached lines cost nothing: no budget, no upstream call.
  const cacheKey = new Request(`https://tts.cache.invalid/${await sha256Hex(`${text}\n${cfg.voiceId}\n${cfg.model}`)}`);
  try {
    const hit = await defaultCache().match(cacheKey);
    if (hit?.body) return audioResponse(hit.body, "hit", cors);
  } catch (err) {
    console.error("tts cache read failed", err);
  }

  try {
    if (!(await reserveBudget(env, cfg.dailyBudget, Math.max(text.length, MIN_CHARGE)))) {
      return json({ error: "tts_budget_exhausted" }, 429, { ...cors, "retry-after": "3600" });
    }
  } catch (err) {
    console.error("tts budget store failed", err);
    return json({ error: "tts_unavailable" }, 503, cors);
  }

  let upstream: Response;
  try {
    upstream = await fetch(`${ELEVENLABS_BASE}/${encodeURIComponent(cfg.voiceId)}/stream?output_format=${OUTPUT_FORMAT}`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "audio/mpeg", "xi-api-key": cfg.apiKey },
      body: JSON.stringify({
        text,
        model_id: cfg.model,
        voice_settings: { stability: 0.5, similarity_boost: 0.8 },
      }),
    });
  } catch (err) {
    console.error("elevenlabs fetch failed", err);
    return json({ error: "tts_upstream_error" }, 502, cors);
  }
  if (!upstream.ok || !upstream.body) {
    console.error("elevenlabs upstream error", upstream.status, (await upstream.text()).slice(0, 300));
    return json({ error: "tts_upstream_error" }, 502, cors);
  }

  const [toClient, toCache] = upstream.body.tee();
  ctx.waitUntil(
    defaultCache()
      .put(
        cacheKey,
        new Response(toCache, {
          headers: { "content-type": "audio/mpeg", "cache-control": `public, max-age=${AUDIO_CACHE_TTL_S}` },
        }),
      )
      .catch((err) => console.error("tts cache write failed", err)),
  );
  return audioResponse(toClient, "miss", cors);
}
