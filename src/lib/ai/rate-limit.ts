/**
 * Shared in-memory rate limiting for the AI API routes.
 * (Per-instance; good enough for a portfolio on a single serverless region.)
 */

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateBucket>();

const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt <= now) rateLimitMap.delete(key);
    }
  }

  if (!bucket || bucket.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}

export function ipFromHeaders(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}
