import type { FormationId } from "@/lib/director/protocol";
import { generateFormation } from "./generate";
import { gauss, mulberry32 } from "./rng";
import type { FormationReply, FormationRequest } from "./worker";

export { sampleSvg, sampleSvgPath } from "../fromSvg";
export { signalAttributes, signalLayout, signalRotation } from "./signal";

const cache = new Map<string, Float32Array>();
const keyOf = (id: FormationId, count: number) => `${id}:${count}`;

/** Formation positions, cached per (id, count). Generates on the calling thread if the worker has not delivered yet. */
export function getFormation(id: FormationId, count: number): Float32Array {
  const key = keyOf(id, count);
  const hit = cache.get(key);
  if (hit) return hit;
  const made = generateFormation(id, count);
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

type Waiter = () => void;
let worker: Worker | null | undefined;
const pending = new Map<string, Waiter[]>();

function getWorker(): Worker | null {
  if (worker !== undefined) return worker;
  worker = null;
  if (typeof Worker === "undefined") return worker;
  try {
    const w = new Worker(new URL("./worker.ts", import.meta.url));
    w.onmessage = (event: MessageEvent<FormationReply>) => {
      const { id, count, data } = event.data;
      const key = keyOf(id, count);
      // The main thread may have generated it already as a fallback; either copy is identical.
      if (!cache.has(key)) cache.set(key, data);
      pending.get(key)?.forEach((done) => done());
      pending.delete(key);
    };
    w.onerror = () => {
      // Pending ids fall back to main-thread generation on demand.
      worker = null;
      w.terminate();
      pending.forEach((waiters) => waiters.forEach((done) => done()));
      pending.clear();
    };
    worker = w;
  } catch {
    worker = null;
  }
  return worker;
}

/** Asks the worker for each missing formation. Resolves once all are cached, or at once if there is no worker. */
export function requestFormations(count: number, ids: FormationId[]): Promise<void> {
  const w = ids.some((id) => !cache.has(keyOf(id, count))) ? getWorker() : null;
  if (!w) return Promise.resolve();
  const waits = ids
    .filter((id) => !cache.has(keyOf(id, count)))
    .map(
      (id) =>
        new Promise<void>((resolve) => {
          const key = keyOf(id, count);
          const waiters = pending.get(key);
          if (waiters) return void waiters.push(resolve);
          pending.set(key, [resolve]);
          const request: FormationRequest = { id, count };
          w.postMessage(request);
        }),
    );
  return Promise.all(waits).then(() => undefined);
}

const idle = (fn: () => void) => {
  const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
  if (w.requestIdleCallback) w.requestIdleCallback(fn, { timeout: 1500 });
  else window.setTimeout(fn, 60);
};

/**
 * Have the given formations ready, skipping any already cached. Called with the chapters the visitor
 * is about to reach. The worker builds them off the main thread; without one, they are built one per
 * idle slice. Returns a cancel function (only the idle fallback is cancellable).
 */
export function warmFormations(count: number, ids: FormationId[]): () => void {
  if (getWorker()) {
    void requestFormations(count, ids);
    return () => {};
  }
  let cancelled = false;
  let i = 0;
  const step = () => {
    while (i < ids.length && cache.has(keyOf(ids[i], count))) i++;
    if (cancelled || i >= ids.length) return;
    getFormation(ids[i++], count);
    idle(step);
  };
  idle(step);
  return () => {
    cancelled = true;
  };
}
