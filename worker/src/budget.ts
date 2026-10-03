import type { Env } from "./env";

const BUDGET_TTL_S = 2 * 24 * 60 * 60;

const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);
const defaultCache = () => (caches as unknown as { default: Cache }).default;

/**
 * Reserve `amount` from today's (UTC) budget under `name`. Returns false when it would exceed `budget`.
 * KV (global, if bound) or the Cache API (per data center, best effort) holds the counter; the
 * read then write is not atomic, so concurrent requests can overshoot by a request or two.
 * Throws if the store fails: the caller fails closed.
 */
export async function reserveDailyBudget(
  env: Env,
  name: string,
  budget: number,
  amount: number,
  now = Date.now(),
): Promise<boolean> {
  const day = utcDay(now);
  const kvKey = `${name}-budget:${day}`;
  const cacheKey = new Request(`https://${name}.budget.invalid/${day}`);

  let used: number;
  if (env.TTS_KV) {
    used = Number(await env.TTS_KV.get(kvKey)) || 0;
  } else {
    const hit = await defaultCache().match(cacheKey);
    used = hit ? Number(await hit.text()) || 0 : 0;
  }
  if (used + amount > budget) return false;

  const next = String(used + amount);
  if (env.TTS_KV) {
    await env.TTS_KV.put(kvKey, next, { expirationTtl: BUDGET_TTL_S });
  } else {
    await defaultCache().put(cacheKey, new Response(next, { headers: { "cache-control": `public, max-age=${BUDGET_TTL_S}` } }));
  }
  return true;
}
