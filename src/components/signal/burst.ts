/**
 * A brief burst of the field, fired when the address is copied. Two ways in, so the contact component can pick:
 *
 *   window.dispatchEvent(new CustomEvent("signal:burst", { detail: { x, y } }))   // x, y: client px, both optional
 *   <button data-copy-email>                                                        // any click on it fires one
 *
 * The origin is the event's point, else the clicked element's centre, else the middle of the address. Repeats
 * inside DEBOUNCE_MS count once, so firing both routes for one copy is harmless.
 */
export const BURST_EVENT = "signal:burst";
const COPY_SELECTOR = "[data-copy-email]";
const DEBOUNCE_MS = 500;
/** Seconds to the peak, and the decay rate afterwards (1/s). The burst is over once the envelope is negligible. */
const RISE_S = 0.14;
const DECAY_RATE = 3.2;
export const BURST_TOTAL_S = 1.9;

export type BurstOrigin = { x: number; y: number } | null;

/** Starts listening; `fire` receives the origin in client px (null: use the address). Returns a cleanup. */
export function installBurst(fire: (origin: BurstOrigin) => void): () => void {
  let last = -Infinity;
  const go = (origin: BurstOrigin) => {
    const now = performance.now();
    if (now - last < DEBOUNCE_MS) return;
    last = now;
    fire(origin);
  };
  const onEvent = (e: Event) => {
    const d = (e as CustomEvent<{ x?: number; y?: number } | undefined>).detail;
    go(typeof d?.x === "number" && typeof d?.y === "number" ? { x: d.x, y: d.y } : null);
  };
  const onClick = (e: MouseEvent) => {
    const el = (e.target as Element | null)?.closest?.(COPY_SELECTOR);
    if (!el) return;
    const r = el.getBoundingClientRect();
    go({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  };
  window.addEventListener(BURST_EVENT, onEvent);
  document.addEventListener("click", onClick, true);
  return () => {
    window.removeEventListener(BURST_EVENT, onEvent);
    document.removeEventListener("click", onClick, true);
  };
}

/** Envelope 0..1 at `t` seconds after the burst: a fast swell, then an exponential settle. */
export function burstEnvelope(t: number): number {
  if (t < 0) return 0;
  if (t < RISE_S) {
    const p = t / RISE_S;
    return p * p * (3 - 2 * p);
  }
  return Math.exp(-(t - RISE_S) * DECAY_RATE);
}
