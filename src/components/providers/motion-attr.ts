/**
 * `html[data-motion="paused"]` is the single switch every stylesheet and loop of this site keys off for the visitor's
 * own "Pause motion" choice (Colophon panel), the way `prefers-reduced-motion` is for the system's. The attribute is
 * written before first paint by the inline script below, then kept in step by MotionState.
 */
export const MOTION_ATTR = "data-motion";
export const MOTION_PAUSED = "paused";
/** Same key and shape as signal/motionPrefs.ts persists. */
const STORAGE_KEY = "db25:motion";

/** Runs in <head> before paint so a stored pause never flashes a frame of motion. Guarded: private windows throw. */
export const MOTION_ATTR_SCRIPT = `try{var m=JSON.parse(localStorage.getItem(${JSON.stringify(STORAGE_KEY)})||"{}");if(m&&m.paused===true)document.documentElement.setAttribute(${JSON.stringify(MOTION_ATTR)},${JSON.stringify(MOTION_PAUSED)})}catch(e){}`;

export function setMotionAttr(paused: boolean) {
  const root = document.documentElement;
  if (paused) root.setAttribute(MOTION_ATTR, MOTION_PAUSED);
  else root.removeAttribute(MOTION_ATTR);
}

/** For loops that run on rAF or the GSAP ticker: CSS cannot pause those. */
export function isMotionPaused(): boolean {
  return typeof document !== "undefined" && document.documentElement.getAttribute(MOTION_ATTR) === MOTION_PAUSED;
}

/** Calls back when the visitor flips the switch (or the attribute changes by any other means). Returns the unsubscribe. */
export function onMotionPausedChange(cb: (paused: boolean) => void): () => void {
  const mo = new MutationObserver(() => cb(isMotionPaused()));
  mo.observe(document.documentElement, { attributes: true, attributeFilter: [MOTION_ATTR] });
  return () => mo.disconnect();
}
