import type { AdaptState } from "./fieldFrame";

/** Floor of the draw range: about the phone count, so a slow desktop GPU can shed down to what a phone draws. */
const MIN_SHARE = 0.12;
const SHRINK_FACTOR = 0.8;
const GROW_FACTOR = 1.15;
const LOW_FPS = 40;
const HIGH_FPS = 57;
const SHRINK_AFTER_FRAMES = 90;
const GROW_AFTER_FRAMES = 300;
const SHRINK_COOLDOWN_MS = 2500;
const GROW_COOLDOWN_MS = 4000;
const FPS_SMOOTHING = 0.04;
/**
 * Frames further apart than this (paused, tab hidden) say nothing about GPU load. Kept well above 100 ms:
 * a software or badly overloaded GPU renders at 100 to 300 ms per frame, which is exactly when to shed.
 */
const MAX_SAMPLE_DELTA = 0.6;
/** Below this rate the shrink is a halving rather than a 20% trim, so a struggling GPU recovers in seconds. */
const CRAWL_FPS = 20;
const CRAWL_SHRINK_FACTOR = 0.5;
const MIN_DELTA = 1 / 60;
/** A shrink this soon after a growth means the higher count is too heavy: wait longer before retrying. */
const FLAP_WINDOW_MS = 12_000;
const MAX_FLAPS = 3;

/**
 * Adaptive draw range. Sustained low frame rate sheds particles; sustained headroom brings them back,
 * with a growing wait if growth keeps being undone. Returns the new active count, or null if unchanged.
 */
export function adaptQuality(a: AdaptState, delta: number, now: number, count: number): number | null {
  if (delta <= 0 || delta > MAX_SAMPLE_DELTA) return null;
  a.fpsEma += (1 / delta - a.fpsEma) * FPS_SMOOTHING;
  if (now < a.after) return null;

  // A slow frame counts as the 60 Hz frames it spans, so shrink waits a fixed time, not a fixed frame count.
  a.slowFrames = a.fpsEma < LOW_FPS ? a.slowFrames + Math.max(1, Math.round(delta / MIN_DELTA)) : 0;
  a.fastFrames = a.fpsEma > HIGH_FPS ? a.fastFrames + 1 : 0;
  const floor = Math.floor(count * MIN_SHARE);

  if (a.slowFrames > SHRINK_AFTER_FRAMES && a.activeCount > floor) {
    if (now - a.lastGrowAt < FLAP_WINDOW_MS) a.flaps = Math.min(MAX_FLAPS, a.flaps + 1);
    const factor = a.fpsEma < CRAWL_FPS ? CRAWL_SHRINK_FACTOR : SHRINK_FACTOR;
    a.activeCount = Math.max(floor, Math.floor(a.activeCount * factor));
    a.slowFrames = 0;
    a.fastFrames = 0;
    a.after = now + SHRINK_COOLDOWN_MS;
    return a.activeCount;
  }

  if (a.fastFrames > GROW_AFTER_FRAMES * 2 ** a.flaps && a.activeCount < count) {
    a.activeCount = Math.min(count, Math.ceil(a.activeCount * GROW_FACTOR));
    a.fastFrames = 0;
    a.lastGrowAt = now;
    a.after = now + GROW_COOLDOWN_MS;
    return a.activeCount;
  }
  return null;
}
