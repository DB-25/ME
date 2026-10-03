/** Cloudflare Rate Limiting binding (see [[ratelimits]] in wrangler.toml). */
export interface RateLimiter {
  limit(options: { key: string }): Promise<{ success: boolean }>;
}

/** The slice of Workers KV the TTS budget uses. */
export interface KvStore {
  get(key: string): Promise<string | null>;
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
  /** Optional KV namespace holding the global daily budget counter. Falls back to the Cache API. */
  TTS_KV?: KvStore;
  TTS_LIMITER?: RateLimiter;
}
