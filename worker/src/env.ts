/** Cloudflare Rate Limiting binding (see [[ratelimits]] in wrangler.toml). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** The slice of Workers KV the daily budgets (TTS characters, Director requests) and the visitor map use. */
export interface KvStore {
  /** `cacheTtl` (seconds, 60 at least on Cloudflare) lets the edge serve a read from its own cache. */
  get(key: string, options?: { cacheTtl?: number }): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

/** The slice of ExecutionContext the Worker uses. */
export interface WorkerContext {
  waitUntil(promise: Promise<unknown>): void;
}

export interface Env {
  OPENAI_API_KEY?: string;
  OPENAI_MODEL: string;
  OPENAI_REASONING_EFFORT?: string;
  ALLOWED_ORIGINS?: string;
  /** Director requests per UTC day across all visitors. Defaults to 300. Over it, POST /director answers 503 director_offline. */
  DIRECTOR_DAILY_BUDGET?: string;
  /** Optional: absent in local dev, where the in-memory limiter alone applies. */
  DIRECTOR_LIMITER?: RateLimiter;

  /** Option B (runtime cloned-voice TTS). Off unless this is "elevenlabs" and both secrets exist. */
  TTS_PROVIDER?: string;
  ELEVENLABS_API_KEY?: string;
  ELEVENLABS_VOICE_ID?: string;
  /** ElevenLabs model id. Defaults to the low latency Flash model. */
  TTS_MODEL?: string;
  /** Characters of new (uncached) speech per UTC day. Defaults to 20000. */
  TTS_DAILY_CHAR_BUDGET?: string;
  /** Optional KV namespace holding the global daily budget counters. Falls back to the Cache API. */
  TTS_KV?: KvStore;
  TTS_LIMITER?: RateLimiter;

  /** The visitors globe (see visits.ts). Both routes answer 503 visits_offline while this is unbound. */
  VISITS_KV?: KvStore;
  /** Secret salt for the per-day visitor hash. Without it POST /visit answers 503 visits_offline (an unsalted IP hash is reversible). */
  VISIT_SALT?: string;
}
