import type { RateLimiter } from "./env";

const CLIENT_KEY_HEX_CHARS = 32;
const MAX_TRACKED_CLIENTS = 5000;

export function json(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "cache-control": "no-store", ...cors },
  });
}

export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Stable, non-reversible key for a client IP: raw addresses are never stored or logged. */
export async function clientKey(ip: string): Promise<string> {
  return (await sha256Hex(ip)).slice(0, CLIENT_KEY_HEX_CHARS);
}

/**
 * A sliding-window limiter, in memory and per isolate: a fallback layer behind the Cloudflare
 * rate limit binding, not a hard guarantee. Pass the binding (if bound) to layer both.
 */
export function createRateLimiter(limit: number, windowMs: number) {
  const hits = new Map<string, number[]>();

  const overLimit = (key: string, now: number): boolean => {
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return true;
    }
    recent.push(now);
    hits.set(key, recent);
    if (hits.size > MAX_TRACKED_CLIENTS) {
      for (const [k, times] of hits) if (times.every((t) => now - t >= windowMs)) hits.delete(k);
    }
    return false;
  };

  return async (binding: RateLimiter | undefined, key: string, now = Date.now()): Promise<boolean> => {
    if (overLimit(key, now)) return true;
    if (!binding) return false;
    try {
      const { success } = await binding.limit({ key });
      return !success;
    } catch (err) {
      // Fail open on the binding only: the in-memory layer above already ran.
      console.error("rate limit binding failed", err);
      return false;
    }
  };
}
