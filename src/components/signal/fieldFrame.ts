import type { FormationId } from "@/lib/director/protocol";
import { CHAPTERS, chapterById } from "@/lib/chapters";
import type { SignalState, SignalOverride } from "@/lib/signal-store";
import { CHAPTER_LOOK, CHAPTER_LOOK_MOBILE, FORMATION_LOOK, NO_CHAPTER_LOOK, OVERRIDE_LOOK, type ChapterLook } from "./look";
import { SETTLE_EPSILON, Tween, clamp01, easeInOut, easeOut, mix, smoothstep01 } from "./ease";
import { DUCK_DIM, READING_DIM, fieldMotion } from "./readingMode";

/**
 * Pure per-frame steps for the field. SignalField's useFrame calls them in order:
 * resolveScroll -> stepIntro -> settleReduced -> (buffer swaps) -> blendLook -> smoothLook -> uniforms.
 * Each writes into preallocated `Scene` / `Rig` objects, so nothing allocates per frame.
 */

export const INTRO_SPREAD = 2.6;
const INTRO_MORPH_SECONDS = 1.4;
const INTRO_MORPH_SECONDS_REDUCED = 0.4;
const INTRO_TIMEOUT_MS = 4000;
const INTRO_CONVERGE_SECONDS = 1.4;
/** Noise before the morph sits at half of the chapter's final brightness so it does not swamp the hero copy. */
const INTRO_WAIT_BRIGHTNESS_SHARE = 0.5;
const REDUCED_SETTLE_RATE = 7;
/** Position and scale follow quickly; light (brightness, alpha, density, sparks) eases over about a second. */
const LOOK_SMOOTH_RATE = 6;
const LIGHT_SMOOTH_RATE = 2.6;
const ENERGY_SMOOTH_RATE = 4;
const ENERGY_BRIGHTNESS_GAIN = 1.5;
const HUE_SMOOTH_RATE = 2.5;

export type IntroPhase = "wait" | "morph" | "done";

/** What scroll, intro and the Director want this frame, before smoothing. */
export type Scene = {
  fromId: FormationId;
  toId: FormationId;
  /** Morph progress between fromId and toId, 0..1. */
  m: number;
  /** Chapter look, blended by scroll morph. */
  look: ChapterLook;
  /** Intro particle spread multiplier and how far the chapter look has faded in. */
  spread: number;
  introW: number;
  /** Formation look, blended and overridden by the Director. */
  alpha: number;
  fog: number;
  sizeMul: number;
  fit: number;
  density: number;
  spark: number;
};

export type Smooth = {
  energy: number;
  brightness: number;
  rightDim: number;
  alpha: number;
  sizeMul: number;
  fit: number;
  fog: number;
  lx: number;
  ly: number;
  lz: number;
  lscale: number;
  hueMix: number;
  density: number;
  spark: number;
  /** Reduced-motion morph (swaps settle quickly instead of scrubbing). */
  morph: number;
};

export type IntroState = {
  phase: IntroPhase;
  start: number;
  morphStart: number;
  spreadFrom: number;
  brightnessFrom: number;
};

export type OverrideState = {
  last: SignalOverride | null;
  value: Tween;
  mix: Tween;
  shownSlot: 0 | 1;
  /** True while the held override is a Director drawing (points), which gets its own framing. */
  points: boolean;
};

export type AdaptState = {
  activeCount: number;
  slowFrames: number;
  fastFrames: number;
  fpsEma: number;
  after: number;
  /** Shrinks that followed a recovery within a short window; stretches the recovery wait. */
  flaps: number;
  lastGrowAt: number;
};

export function createScene(): Scene {
  return {
    fromId: "noise",
    toId: "noise",
    m: 0,
    look: { brightness: 0, x: 0, y: 0, z: 0, scale: 1, rightDim: 0 },
    spread: 1,
    introW: 1,
    alpha: 0.5,
    fog: 0.09,
    sizeMul: 1,
    fit: 3,
    density: 1,
    spark: 1,
  };
}

export function createSmooth(): Smooth {
  return { energy: 0, brightness: 0, rightDim: 0, alpha: 0.5, sizeMul: 1, fit: 3, fog: 0.09, lx: 0, ly: 0, lz: 0, lscale: 1, hueMix: 0, density: 1, spark: 1, morph: 0 };
}

export function createIntro(now: number): IntroState {
  return { phase: "wait", start: now, morphStart: 0, spreadFrom: INTRO_SPREAD, brightnessFrom: 0.3 };
}

export function createOverrideState(): OverrideState {
  return { last: null, value: new Tween(0), mix: new Tween(0), shownSlot: 0, points: false };
}

export function createAdapt(now: number, count: number): AdaptState {
  return { activeCount: count, slowFrames: 0, fastFrames: 0, fpsEma: 60, after: now + 4000, flaps: 0, lastGrowAt: 0 };
}

/** Scroll position -> formations, morph and chapter look. */
export function resolveScroll(out: Scene, s: Pick<SignalState, "chapter" | "morph">, aspect: number, hasChapters: boolean) {
  const chapter = chapterById(s.chapter);
  const idx = CHAPTERS.indexOf(chapter);
  const prev = CHAPTERS[Math.max(0, idx - 1)];
  const looks = aspect > 1.2 ? CHAPTER_LOOK : CHAPTER_LOOK_MOBILE;
  const lp = looks[prev.id];
  const lc = looks[chapter.id];
  const eb = smoothstep01(s.morph);
  const look = out.look;

  out.fromId = idx === 0 ? chapter.formation : prev.formation;
  out.toId = chapter.formation;
  out.m = s.morph;
  look.brightness = mix(lp.brightness, lc.brightness, eb);
  look.rightDim = mix(lp.rightDim, lc.rightDim, eb);
  look.x = mix(lp.x, lc.x, eb);
  look.y = mix(lp.y, lc.y, eb);
  look.z = mix(lp.z, lc.z, eb);
  look.scale = mix(lp.scale, lc.scale, eb);

  // Routes without chapters (case studies) settle into a dim noise drift.
  if (!hasChapters) {
    out.fromId = "noise";
    out.toId = "noise";
    out.m = 0;
    Object.assign(look, NO_CHAPTER_LOOK);
  }
}

/**
 * Intro: the preloader shows dim noise; when `ready` flips (or the timeout lapses) the noise flies into
 * the scroll formation, left side first. Mutates `out` while the intro runs.
 */
export function stepIntro(intro: IntroState, out: Scene, now: number, opts: { ready: boolean; reduced: boolean; hold: boolean; skip: boolean; spreadNow: number; brightnessNow: number }) {
  out.spread = 1;
  out.introW = 1;
  if (opts.skip) intro.phase = "done";
  if (intro.phase === "done") return;

  const waitedMs = now - intro.start;
  const waited = waitedMs / 1000;
  // No minimum hold: once the field is mounted and the page is ready, noise converges immediately.
  if (intro.phase === "wait" && (opts.ready || (!opts.hold && waitedMs > INTRO_TIMEOUT_MS))) {
    intro.phase = "morph";
    intro.morphStart = now;
    intro.spreadFrom = opts.spreadNow;
    intro.brightnessFrom = Math.max(opts.brightnessNow, out.look.brightness * INTRO_WAIT_BRIGHTNESS_SHARE);
  }

  if (intro.phase === "wait") {
    const conv = easeOut(clamp01(waited / INTRO_CONVERGE_SECONDS));
    out.spread = mix(INTRO_SPREAD, 1, conv);
    out.fromId = "noise";
    out.toId = "noise";
    out.m = 0;
    out.look.brightness *= INTRO_WAIT_BRIGHTNESS_SHARE;
    out.introW = 0;
    return;
  }

  const seconds = opts.reduced ? INTRO_MORPH_SECONDS_REDUCED : INTRO_MORPH_SECONDS;
  const p = clamp01((now - intro.morphStart) / 1000 / seconds);
  const e = easeInOut(p);
  out.fromId = "noise";
  out.m = e;
  out.look.brightness = mix(intro.brightnessFrom, out.look.brightness, e);
  out.spread = mix(intro.spreadFrom, 1, e);
  out.introW = e;
  if (p >= 1) intro.phase = "done";
}

/** Reduced motion: formation swaps are quick settles, not scrubbed morphs. Returns the remaining gap. */
export function settleReduced(smooth: Smooth, out: Scene, dt: number): number {
  const target = out.m >= 0.5 ? 1 : 0;
  smooth.morph += (target - smooth.morph) * Math.min(1, dt * REDUCED_SETTLE_RATE);
  if (Math.abs(smooth.morph - target) < 0.002) smooth.morph = target;
  out.m = smooth.morph;
  return Math.abs(smooth.morph - target);
}

/** Per-formation sprite look, chapter look under intro and Director override. `ov` is the override mix. */
export function blendLook(out: Scene, smooth: Smooth, ov: number, reduced: boolean, reading: number) {
  const lookA = FORMATION_LOOK[out.fromId];
  const lookB = FORMATION_LOOK[out.toId];
  const mm = reduced ? out.m : smoothstep01(out.m);
  const look = out.look;

  // The chapter look fades in with the intro and out while the Director's drawing owns the field.
  const calm = out.introW * (1 - ov);
  look.x *= calm;
  look.y *= calm;
  look.z *= calm;
  look.scale = 1 + (look.scale - 1) * calm;
  // Reading mode: back off while text is being read, but never dim a Director drawing.
  look.brightness *= 1 - READING_DIM * reading * (1 - ov);
  // A section with dense copy over the field's half of the screen can duck it further.
  look.brightness *= 1 - DUCK_DIM * fieldMotion.duck * (1 - ov);
  // The Director (override or streaming energy) brings the field up to full light.
  look.brightness += (1 - look.brightness) * Math.min(1, smooth.energy * ENERGY_BRIGHTNESS_GAIN);
  look.brightness = mix(look.brightness, OVERRIDE_LOOK.brightness, ov);
  look.rightDim *= 1 - ov;

  out.alpha = mix(mix(lookA.alpha, lookB.alpha, mm), OVERRIDE_LOOK.alpha, ov);
  out.fog = mix(mix(lookA.fog, lookB.fog, mm), OVERRIDE_LOOK.fog, ov);
  out.sizeMul = mix(mix(lookA.size, lookB.size, mm), OVERRIDE_LOOK.size, ov);
  out.fit = mix(mix(lookA.fit, lookB.fit, mm), OVERRIDE_LOOK.fit, ov);
  out.density = mix(mix(lookA.density, lookB.density, mm), OVERRIDE_LOOK.density, ov);
  out.spark = mix(mix(lookA.spark, lookB.spark, mm), OVERRIDE_LOOK.spark, ov);
}

/** Light smoothing keeps look changes from flickering on jumpy scroll input. Returns the largest remaining gap. */
export function smoothLook(smooth: Smooth, out: Scene, energyTarget: number, dt: number): number {
  const k = Math.min(1, dt * LOOK_SMOOTH_RATE);
  const kLight = Math.min(1, dt * LIGHT_SMOOTH_RATE);
  const look = out.look;
  let gap = 0;
  const follow = (cur: number, target: number, rate: number) => {
    const next = cur + (target - cur) * rate;
    const g = Math.abs(target - next);
    if (g > gap) gap = g;
    return next;
  };
  smooth.brightness = follow(smooth.brightness, look.brightness, kLight);
  smooth.rightDim = follow(smooth.rightDim, look.rightDim, kLight);
  smooth.alpha = follow(smooth.alpha, out.alpha, kLight);
  smooth.density = follow(smooth.density, out.density, kLight);
  smooth.spark = follow(smooth.spark, out.spark, kLight);
  smooth.sizeMul = follow(smooth.sizeMul, out.sizeMul, k);
  smooth.fit = follow(smooth.fit, out.fit, k);
  smooth.fog = follow(smooth.fog, out.fog, k);
  smooth.lx = follow(smooth.lx, look.x, k);
  smooth.ly = follow(smooth.ly, look.y, k);
  smooth.lz = follow(smooth.lz, look.z, k);
  smooth.lscale = follow(smooth.lscale, look.scale, k);
  smooth.energy = follow(smooth.energy, energyTarget, Math.min(1, dt * ENERGY_SMOOTH_RATE));
  return gap;
}

/** Hue tint eases in and out; returns the remaining gap. */
export function stepHue(smooth: Smooth, hasHue: boolean, dt: number): number {
  const target = hasHue ? 1 : 0;
  smooth.hueMix += (target - smooth.hueMix) * Math.min(1, dt * HUE_SMOOTH_RATE);
  return Math.abs(target - smooth.hueMix);
}

/** True while a scene still changes by itself, i.e. frames must keep coming even without input. */
export function isSettling(gaps: { look: number; reducedMorph: number; hue: number }, intro: IntroState, ov: OverrideState): boolean {
  return (
    intro.phase !== "done" ||
    !ov.value.settled ||
    !ov.mix.settled ||
    gaps.look > SETTLE_EPSILON ||
    gaps.reducedMorph > SETTLE_EPSILON ||
    gaps.hue > SETTLE_EPSILON
  );
}
