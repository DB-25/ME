/** Small scheduling helpers: keep non-critical field work off the load and hydration path. Each returns a cancel function. */

const IDLE_TIMEOUT_MS = 1200;
const FALLBACK_DELAY_MS = 150;

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };

export function onIdle(cb: () => void): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout: IDLE_TIMEOUT_MS });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, FALLBACK_DELAY_MS);
  return () => window.clearTimeout(id);
}

/** After the first frame has been presented, so field work never competes with first paint. */
export function afterPaint(cb: () => void): () => void {
  let timer = 0;
  const raf = requestAnimationFrame(() => {
    timer = window.setTimeout(cb, 0);
  });
  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  };
}
