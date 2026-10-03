import type { AdaptState } from "./fieldFrame";

const MIN_SHARE = 0.4;
const SHRINK_FACTOR = 0.8;
const GROW_FACTOR = 1.15;
const LOW_FPS = 40;
const HIGH_FPS = 57;
const SHRINK_AFTER_FRAMES = 90;
const GROW_AFTER_FRAMES = 300;
const SHRINK_COOLDOWN_MS = 2500;
const GROW_COOLDOWN_MS = 4000;
const FPS_SMOOTHING = 0.04;
/** Frames further apart than this (paused, or on-demand idle) say nothing about GPU load. */
const MAX_SAMPLE_DELTA = 0.1;
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

  a.slowFrames = a.fpsEma < LOW_FPS ? a.slowFrames + 1 : 0;
  a.fastFrames = a.fpsEma > HIGH_FPS ? a.fastFrames + 1 : 0;
  const floor = Math.floor(count * MIN_SHARE);

  if (a.slowFrames > SHRINK_AFTER_FRAMES && a.activeCount > floor) {
    if (now - a.lastGrowAt < FLAP_WINDOW_MS) a.flaps = Math.min(MAX_FLAPS, a.flaps + 1);
    a.activeCount = Math.max(floor, Math.floor(a.activeCount * SHRINK_FACTOR));
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
