export const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
export const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
export const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);
export const smoothstep01 = (m: number) => m * m * (3 - 2 * m);
export const mix = (a: number, b: number, t: number) => a + (b - a) * t;

/** Smoothing below this is imperceptible; used to decide when a settled scene can stop rendering. */
export const SETTLE_EPSILON = 0.0008;

/** A scalar that eases from its current value to a target over real time. No allocation per frame. */
export class Tween {
  value: number;
  private from: number;
  private to: number;
  private t0 = 0;
  private dur = 1;
  constructor(v: number) {
    this.value = this.from = this.to = v;
  }
  get target() {
    return this.to;
  }
  get settled() {
    return Math.abs(this.value - this.to) < 0.0005;
  }
  /** Starts easing toward `to` over `dur` ms (`now` is performance.now()); `delay` (ms) holds the current value first. */
  go(to: number, now: number, dur: number, delay = 0) {
    this.from = this.value;
    this.to = to;
    this.t0 = now + delay;
    this.dur = Math.max(0.001, dur);
  }
  snap(v: number) {
    this.value = this.from = this.to = v;
  }
  step(now: number) {
    this.value = this.from + (this.to - this.from) * easeInOut(clamp01((now - this.t0) / this.dur));
    return this.value;
  }
}
