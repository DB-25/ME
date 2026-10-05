/**
 * Reading mode: when the visitor stops scrolling the field backs off (dimmer, slower, fewer sparks)
 * so it never competes with the text being read. Pure steps, shared by the field and camera rig.
 */

/** Scroll speed (px/s) under which the visitor counts as not scrolling. */
const MOVING_PX_PER_S = 40;
/** Stillness required before the field starts backing off. */
const IDLE_SECONDS = 0.6;
/** Ease rates (1/s): settling in is slow, waking up on scroll is quicker but still over ~0.7 s. */
const SETTLE_RATE = 1.4;
const WAKE_RATE = 3;

/** Brightness removed at full reading mode. */
export const READING_DIM = 0.25;
/** Shader and orbit clock speed at full reading mode. */
export const READING_TIME_SCALE = 0.4;
/** Chapter-less routes (case studies) hold this clock speed: nearly still. */
export const STILL_TIME_SCALE = 0.12;

export type ReadingState = { lastY: number; idle: number; value: number };

export const createReading = (): ReadingState => ({ lastY: 0, idle: 0, value: 0 });

/** Advances the state and returns 0..1: how deep into reading mode the field is. */
export function stepReading(r: ReadingState, scrollY: number, dt: number, forced: boolean): number {
  const speed = Math.abs(scrollY - r.lastY) / Math.max(dt, 0.001);
  r.lastY = scrollY;
  r.idle = speed > MOVING_PX_PER_S ? 0 : r.idle + dt;
  const target = forced || r.idle > IDLE_SECONDS ? 1 : 0;
  const rate = target > r.value ? SETTLE_RATE : WAKE_RATE;
  r.value += (target - r.value) * Math.min(1, dt * rate);
  if (Math.abs(r.value - target) < 0.002) r.value = target;
  return r.value;
}

/** Clock speed for a reading depth (1 normally, slower while reading). */
export const timeScaleFor = (reading: number, still: boolean) =>
  still ? STILL_TIME_SCALE : 1 + (READING_TIME_SCALE - 1) * reading;

/** Extra brightness removed while a dense text block (Systems principles and stack) is in view. */
export const DUCK_DIM = 0.7;

/**
 * Shared with the camera rig, which reads it each frame.
 * `hold` (0..1) freezes the camera's orbit and parallax while a formation must stay registered to the DOM (Contact).
 * `duck` is set by a section (0 or 1) and eased by the look smoothing; it dims the field under dense copy.
 */
export const fieldMotion = { reading: 0, timeScale: 1, duck: 0, hold: 0 };
