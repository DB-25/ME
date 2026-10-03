import type { FormationId } from "@/lib/director/protocol";
import { constellationFormation } from "./constellation";
import { crosshairFormation } from "./crosshair";
import { crowdFormation } from "./crowd";
import { globeFormation } from "./globe";
import { networkFormation } from "./network";
import { noiseFormation } from "./noise";
import { gauss, mulberry32, shufflePoints } from "./rng";
import { signalFormation } from "./signal";
import { singularityFormation } from "./singularity";

export { sampleSvg, sampleSvgPath } from "../fromSvg";
export { signalAttributes, signalLayout, signalRotation } from "./signal";

type Generator = (count: number) => Float32Array;

const GENERATORS: Record<FormationId, Generator> = {
  noise: noiseFormation,
  signal: signalFormation,
  globe: globeFormation,
  network: networkFormation,
  crowd: crowdFormation,
  constellation: constellationFormation,
  crosshair: crosshairFormation,
  singularity: singularityFormation,
};

const cache = new Map<string, Float32Array>();

/** Formations whose particle index carries meaning (line / slot) must keep their order. */
const UNSHUFFLED: FormationId[] = ["signal"];

/**
 * Cached formation positions. Generated once per (id, count). Points are
 * shuffled so any prefix is an unbiased subset (used for adaptive quality).
 */
export function getFormation(id: FormationId, count: number): Float32Array {
  const key = `${id}:${count}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const raw = GENERATORS[id](count);
  const made = UNSHUFFLED.includes(id) ? raw : shufflePoints(raw, mulberry32(count + id.length * 7919));
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
  const jitter = count > n ? 0.001 : 0;
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

/**
 * Generate the given formations, one per idle slice, skipping any already cached. Called with the
 * chapters the visitor is about to reach so the heavy ones (globe, network, crowd, constellation)
 * are not built at boot. Returns a cancel function.
 */
export function warmFormations(count: number, ids: FormationId[]): () => void {
  let cancelled = false;
  let i = 0;
  const step = () => {
    while (i < ids.length && cache.has(`${ids[i]}:${count}`)) i++;
    if (cancelled || i >= ids.length) return;
    getFormation(ids[i++], count);
    idle(step);
  };
  idle(step);
  return () => {
    cancelled = true;
  };
}
