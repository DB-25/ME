import type { Env } from "./env";
import { clientKey, createRateLimiter, json, sha256Hex } from "./http";

/**
 * The visitors globe: one count per visitor per UTC day, binned to a coarse grid, no IPs kept.
 *
 *   POST /visit   counts the caller (once a day) and answers with their own cell.
 *   GET  /visits  the whole map: { cells: [[lat, lon, count]...], total, countries, updatedAt }.
 *
 * Storage is KV (`VISITS_KV`): one `seen:<hash>` marker per visitor per day (26 h TTL) and ONE aggregate
 * document. The aggregate is read, bumped and written back, which is NOT atomic: two visitors landing in the
 * same instant can drop one count. At this site's scale that is fine, and it is far cheaper than a key per
 * cell plus a list on every read. KV free tier allows 1,000 writes a day, so about 500 new visitors a day.
 *
 * Privacy: the location is Cloudflare's coarse city-level guess, rounded to a 5 degree cell. The marker key is
 * SHA-256(IP | UTC date | VISIT_SALT): the raw IP is hashed in memory and is never stored or logged.
 */

export const CELL_DEG = 5;
const DEDUPE_TTL_S = 26 * 60 * 60;
const AGGREGATE_KEY = "visits:v1";
const READ_CACHE_S = 60;
const MAX_COUNTRIES = 250;
const POST_LIMIT = 10;
const GET_LIMIT = 60;
const RATE_WINDOW_MS = 10 * 60 * 1000;

const isPostLimited = createRateLimiter(POST_LIMIT, RATE_WINDOW_MS);
const isGetLimited = createRateLimiter(GET_LIMIT, RATE_WINDOW_MS);

type Aggregate = { total: number; cells: Record<string, number>; countries: Record<string, number>; updatedAt: string | null };
type Cell = { latIdx: number; lonIdx: number; lat: number; lon: number };
type CfInfo = { latitude?: string | number; longitude?: string | number; country?: string };

const offline = (cors: Record<string, string>) => json({ error: "visits_offline" }, 503, cors);

const clampIdx = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** The 5 degree cell holding a coordinate, with the cell's centre. Null for anything that is not a real coordinate. */
export function cellOf(latitude: unknown, longitude: unknown): Cell | null {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (latitude === undefined || longitude === undefined || latitude === "" || longitude === "") return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) return null;
  const latIdx = clampIdx(Math.floor(lat / CELL_DEG), -90 / CELL_DEG, 90 / CELL_DEG - 1);
  const lonIdx = clampIdx(Math.floor(lon / CELL_DEG), -180 / CELL_DEG, 180 / CELL_DEG - 1);
  return { latIdx, lonIdx, lat: latIdx * CELL_DEG + CELL_DEG / 2, lon: lonIdx * CELL_DEG + CELL_DEG / 2 };
}

const isCountsRecord = (value: unknown): value is Record<string, number> =>
  typeof value === "object" && value !== null && Object.values(value).every((n) => typeof n === "number" && Number.isFinite(n));

function emptyAggregate(): Aggregate {
  return { total: 0, cells: {}, countries: {}, updatedAt: null };
}

function parseAggregate(raw: string | null): Aggregate {
  if (!raw) return emptyAggregate();
  try {
    const doc = JSON.parse(raw) as Partial<Aggregate>;
    if (typeof doc.total !== "number" || !isCountsRecord(doc.cells) || !isCountsRecord(doc.countries)) return emptyAggregate();
    return { total: doc.total, cells: doc.cells, countries: doc.countries, updatedAt: typeof doc.updatedAt === "string" ? doc.updatedAt : null };
  } catch {
    return emptyAggregate();
  }
}

/** The grid cell and country Cloudflare resolved for this request, if any (absent under `wrangler dev` and for some networks). */
function locate(request: Request): { cell: Cell; country: string | null } | null {
  const cf = (request as Request & { cf?: CfInfo }).cf;
  const cell = cf ? cellOf(cf.latitude, cf.longitude) : null;
  if (!cell || !cf) return null;
  const country = typeof cf.country === "string" && /^[A-Za-z]{2}$/.test(cf.country) ? cf.country.toUpperCase() : null;
  return { cell, country };
}

const utcDay = (now: number) => new Date(now).toISOString().slice(0, 10);

export async function handleVisit(request: Request, env: Env, cors: Record<string, string>, now = Date.now()): Promise<Response> {
  const kv = env.VISITS_KV;
  if (!kv || !env.VISIT_SALT) return offline(cors);

  const ip = request.headers.get("cf-connecting-ip");
  if (!ip) return json({ error: "client_unidentified" }, 400, cors);
  if (await isPostLimited(undefined, await clientKey(ip), now)) return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "600" });

  const where = locate(request);
  // No location (local dev, some networks): nothing to count, and nothing to flare.
  if (!where) return json({ counted: false, cell: null, country: null }, 200, cors);
  const { cell, country } = where;
  const reply = (counted: boolean) => json({ counted, cell: [cell.lat, cell.lon], country }, 200, cors);

  try {
    const marker = `seen:${await sha256Hex(`${ip}|${utcDay(now)}|${env.VISIT_SALT}`)}`;
    if ((await kv.get(marker)) !== null) return reply(false);
    // Marker first: if the aggregate write then fails, a visit is lost rather than double counted.
    await kv.put(marker, "1", { expirationTtl: DEDUPE_TTL_S });

    const agg = parseAggregate(await kv.get(AGGREGATE_KEY));
    const key = `${cell.latIdx}:${cell.lonIdx}`;
    agg.total += 1;
    agg.cells[key] = (agg.cells[key] ?? 0) + 1;
    if (country) agg.countries[country] = (agg.countries[country] ?? 0) + 1;
    agg.updatedAt = new Date(now).toISOString();
    await kv.put(AGGREGATE_KEY, JSON.stringify(agg));
    return reply(true);
  } catch (err) {
    console.error("visits store failed", err);
    return offline(cors);
  }
}

export async function handleVisits(request: Request, env: Env, cors: Record<string, string>, now = Date.now()): Promise<Response> {
  const kv = env.VISITS_KV;
  if (!kv) return offline(cors);

  const ip = request.headers.get("cf-connecting-ip");
  if (ip && (await isGetLimited(undefined, await clientKey(ip), now))) return json({ error: "rate_limited" }, 429, { ...cors, "retry-after": "600" });

  let agg: Aggregate;
  try {
    // The edge may serve this read from its cache for a minute: the map does not need to be live to the second.
    agg = parseAggregate(await kv.get(AGGREGATE_KEY, { cacheTtl: READ_CACHE_S }));
  } catch (err) {
    console.error("visits read failed", err);
    return offline(cors);
  }

  const cells = Object.entries(agg.cells).flatMap(([key, count]) => {
    const [latIdx, lonIdx] = key.split(":").map(Number);
    const cell = cellOf(latIdx * CELL_DEG, lonIdx * CELL_DEG);
    return cell && count > 0 ? [[cell.lat, cell.lon, count]] : [];
  });
  const countries = Object.entries(agg.countries)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, MAX_COUNTRIES);

  return json({ cells, total: agg.total, countries, updatedAt: agg.updatedAt }, 200, { ...cors, "cache-control": `public, max-age=${READ_CACHE_S}` });
}
