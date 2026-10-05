/**
 * The visitor's own motion switches (Colophon panel). Persisted per device; every storage call is guarded because
 * private windows and blocked site data throw. `paused` reuses the reduced-motion path of the field and turns off
 * the smooth scroll; `still` skips WebGL and shows the hero poster.
 */

export type MotionPrefs = { paused: boolean; still: boolean };

const KEY = "db25:motion";
const DEFAULTS: MotionPrefs = { paused: false, still: false };
/** Lenis is created by the SmoothScroll provider; wait this many frames for it before giving up. */
const LENIS_WAIT_FRAMES = 120;

type LenisLike = {
  options: { smoothWheel?: boolean };
  scrollTo: (target: unknown, options?: object) => void;
};
const getLenis = () => (window as unknown as { lenis?: LenisLike }).lenis;

function read(): MotionPrefs {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    const parsed = JSON.parse(raw) as Partial<MotionPrefs>;
    return { paused: parsed.paused === true, still: parsed.still === true };
  } catch {
    return DEFAULTS;
  }
}

let prefs: MotionPrefs | null = null;
const listeners = new Set<(next: MotionPrefs, prev: MotionPrefs) => void>();

export function getMotionPrefs(): MotionPrefs {
  prefs ??= read();
  return prefs;
}

export function subscribeMotionPrefs(listener: (next: MotionPrefs, prev: MotionPrefs) => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Native wheel scrolling and instant jumps for in-page links, or back to Lenis' defaults. */
function applySmoothScroll(paused: boolean, framesLeft = LENIS_WAIT_FRAMES) {
  const lenis = getLenis();
  if (!lenis) {
    // Only a stored "paused" has to wait for the provider to mount; an unpaused page has nothing to undo.
    if (paused && framesLeft > 0) requestAnimationFrame(() => applySmoothScroll(getMotionPrefs().paused, framesLeft - 1));
    return;
  }
  lenis.options.smoothWheel = !paused;
  if (paused) {
    const original = Object.getPrototypeOf(lenis).scrollTo as LenisLike["scrollTo"];
    lenis.scrollTo = (target, options) => original.call(lenis, target, { ...options, immediate: true });
  } else if (Object.prototype.hasOwnProperty.call(lenis, "scrollTo")) {
    delete (lenis as Partial<LenisLike>).scrollTo;
  }
}

/** Call once on mount: re-applies a stored pause to the smooth scroll. Does nothing for the default. */
export function syncSmoothScroll() {
  if (getMotionPrefs().paused) applySmoothScroll(true);
}

export function setMotionPref(key: keyof MotionPrefs, value: boolean) {
  const prev = getMotionPrefs();
  if (prev[key] === value) return;
  const next = { ...prev, [key]: value };
  prefs = next;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Not persisted (private window, blocked storage): the choice still holds for this visit.
  }
  if (key === "paused") applySmoothScroll(value);
  listeners.forEach((l) => l(next, prev));
}
