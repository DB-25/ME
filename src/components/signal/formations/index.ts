import type { FormationId } from "@/lib/director/protocol";
import { constellationFormation } from "./constellation";
import { crosshairFormation } from "./crosshair";
import { crowdFormation } from "./crowd";
import { globeFormation } from "./globe";
import { monogramFormation } from "./monogram";
import { networkFormation } from "./network";
import { noiseFormation } from "./noise";
import { loadPortrait } from "./portrait";
import { gauss, mulberry32, shufflePoints } from "./rng";
import { singularityFormation } from "./singularity";

export { sampleSvg, sampleSvgPath } from "../fromSvg";

type Generator = (count: number) => Float32Array;

/** Formations that load asynchronously (images). Until ready they show the noise cloud. */
const ASYNC_FORMATIONS: FormationId[] = ["portrait"];

const GENERATORS: Record<Exclude<FormationId, "portrait">, Generator> = {
  noise: noiseFormation,
  monogram: monogramFormation,
  globe: globeFormation,
  network: networkFormation,
  crowd: crowdFormation,
  constellation: constellationFormation,
  crosshair: crosshairFormation,
  singularity: singularityFormation,
};

/** Idle warm-up order: what the user meets first is generated first. */
const WARM_ORDER: FormationId[] = ["noise", "monogram", "portrait", "globe", "network", "crowd", "constellation", "crosshair", "singularity"];

const cache = new Map<string, Float32Array>();

type AsyncEntry = { positions: Float32Array; tint: Float32Array; loading: boolean };
const asyncCache = new Map<string, AsyncEntry>();
const readyListeners = new Set<(id: FormationId) => void>();

/** Subscribe to async formations finishing (the field re-uploads the buffers). */
export function onFormationReady(cb: (id: FormationId) => void): () => void {
  readyListeners.add(cb);
  return () => readyListeners.delete(cb);
}

/** Per-particle tint (rgb + brightness) for the portrait. Before it loads: plain ultraviolet. */
export function getPortraitTint(count: number): Float32Array {
  return ensureAsync("portrait", count).tint;
}

function ensureAsync(id: FormationId, count: number): AsyncEntry {
  const key = `${id}:${count}`;
  const hit = asyncCache.get(key);
  if (hit) return hit;
  const tint = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    tint[i * 4] = 0.545;
    tint[i * 4 + 1] = 0.482;
    tint[i * 4 + 2] = 1;
    tint[i * 4 + 3] = 1;
  }
  const entry: AsyncEntry = { positions: new Float32Array(getFormation("noise", count)), tint, loading: true };
  asyncCache.set(key, entry);
  loadPortrait(count).then((data) => {
    entry.loading = false;
    if (!data) return;
    entry.positions.set(data.positions);
    entry.tint.set(data.tint);
    readyListeners.forEach((cb) => cb(id));
  });
  return entry;
}

/**
 * Cached formation positions. Generated once per (id, count). Points are
 * shuffled so any prefix is an unbiased subset (used for adaptive quality).
 */
export function getFormation(id: FormationId, count: number): Float32Array {
  if (ASYNC_FORMATIONS.includes(id)) return ensureAsync(id, count).positions;
  const key = `${id}:${count}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const made = shufflePoints(GENERATORS[id as Exclude<FormationId, "portrait">](count), mulberry32(count + id.length * 7919));
  cache.set(key, made);
  return made;
}

/** Same framing and shuffle as built-ins, for externally supplied points (Director draw). */
export function prepareCustomPoints(points: Float32Array, count: number): Float32Array {
  const n = points.length / 3;
  if (n === count) return points;
  const out = new Float32Array(count * 3);
  const rand = mulberry32(n + count);
  // Surplus particles reuse targets with a tiny fan-out so duplicates do not stack exactly.
  const jitter = count > n ? 0.006 : 0;
  for (let i = 0; i < count; i++) {
    const j = i % n;
    const extra = i >= n ? jitter : 0;
    out[i * 3] = points[j * 3] + gauss(rand) * extra;
    out[i * 3 + 1] = points[j * 3 + 1] + gauss(rand) * extra;
    out[i * 3 + 2] = points[j * 3 + 2] + gauss(rand) * extra;
  }
  return out;
}

const idle = (fn: () => void) => {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1500 });
  else window.setTimeout(fn, 60);
};

/** Generate every formation one per idle slice so the main thread never blocks. */
export function warmFormations(count: number, onEach?: (id: FormationId) => void): () => void {
  let cancelled = false;
  let i = 0;
  const step = () => {
    if (cancelled || i >= WARM_ORDER.length) return;
    const id = WARM_ORDER[i++];
    getFormation(id, count);
    onEach?.(id);
    idle(step);
  };
  idle(step);
  return () => {
    cancelled = true;
  };
}
