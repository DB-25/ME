import { BufferAttribute, Color, Points, Vector2, Vector3, type PerspectiveCamera, type ShaderMaterial } from "three";
import { CHAPTERS, chapterById } from "@/lib/chapters";
import type { FormationId } from "@/lib/director/protocol";
import { signalStore, type SignalOverride, type SignalState } from "@/lib/signal-store";
import { adaptQuality } from "./adaptive";
import { chapterPresence } from "./chapterPresence";
import { devFlag, recordFrame } from "./devtools";
import { patchFieldStatus } from "./fieldStatus";
import {
  INTRO_SPREAD,
  blendLook,
  createAdapt,
  createIntro,
  createOverrideState,
  createScene,
  createSmooth,
  isSettling,
  resolveScroll,
  settleReduced,
  smoothLook,
  stepHue,
  stepIntro,
  type OverrideState,
  type Scene,
  type Smooth,
} from "./fieldFrame";
import { BASE_PARTICLE_SIZE, createFieldBuffers } from "./fieldMaterial";
import type { FieldQuality, FrameInfo } from "./fieldTypes";
import { createGlobeRig, stepGlobe, type GlobeRig } from "./globeRig";
import { onGlobeStory } from "./globeStory";
import { createReading, fieldMotion, stepReading, timeScaleFor, type ReadingState } from "./readingMode";
import { FRAME_H } from "./fromSvg";
import { getFormation, prepareCustomPoints, warmFormations } from "./formations";

const OVERRIDE_MS = 1600;
const OVERRIDE_MS_REDUCED = 400;
const MAX_DT = 0.25;
/** First frame after an idle stretch (on-demand rendering): treat it as one 60 Hz step, not the whole gap. */
const RESUME_DT = 1 / 60;
const CAMERA_FOV = 38;
const BASE_CAMERA_Z = 7;
const MAX_PULLBACK = 2.8;
const HALF_TAN_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);
/** Mid-morph turbulence ceiling (the shader's burst is already short); reading mode and case pages lower it. */
const TURBULENCE = 0.5;
const TURBULENCE_READING_SHARE = 0.5;
const TURBULENCE_STILL = 0.12;
const POINTER_STRENGTH = 0.2;
const POINTER_FOLLOW_RATE = 9;
const POINTER_FADE_RATE = 5;
/** Shader time is frozen under reduced motion so a settled scene is a still image. */
const REDUCED_SHADER_TIME = 3;
/** Formations generated ahead of the visitor: the current chapter's and the next two. */
const WARM_AHEAD = 2;
/** Director drawings: at most this share of viewport height, and the bottom edge stays above the caption lane. */
const DRAWING_MAX_HEIGHT = 0.55;
const DRAWING_BOTTOM_LIMIT = 0.3;
const DRAWING_LIFT_MARGIN = 0.02;
const SPARK_READING_CUT = 0.6;

function parseHex(hex: string, out: Color): boolean {
  if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex.trim())) return false;
  out.set(hex.startsWith("#") ? hex : `#${hex}`);
  return true;
}

/** Formations to have ready for a chapter: its own, then the next ones in scroll order. */
export function formationsAhead(chapterId: SignalState["chapter"]): FormationId[] {
  if (!chapterPresence.present) return [];
  const idx = CHAPTERS.indexOf(chapterById(chapterId));
  const ids: FormationId[] = [];
  for (let i = idx; i <= Math.min(CHAPTERS.length - 1, idx + WARM_AHEAD); i++) {
    if (!ids.includes(CHAPTERS[i].formation)) ids.push(CHAPTERS[i].formation);
  }
  return ids;
}

type Rig = {
  t: number;
  /** True when the previous frame asked for this one, so `delta` is a real step. */
  chained: boolean;
  reading: ReadingState;
  pointer: { x: number; y: number; tx: number; ty: number; active: number };
  intro: ReturnType<typeof createIntro>;
  override: OverrideState;
  scene: Scene;
  smooth: Smooth;
  adapt: ReturnType<typeof createAdapt>;
  fromId: FormationId;
  toId: FormationId;
  spreadNow: number;
  /** Eased override and slot mix, written each frame. */
  ov: { value: number; mix: number };
  globe: GlobeRig;
};

/** Writes every uniform the shader reads this frame, plus camera distance and sprite scale. */
function writeUniforms(
  u: ShaderMaterial["uniforms"],
  camera: PerspectiveCamera,
  size: { width: number; height: number },
  r: Rig,
  opts: { reduced: boolean; sizeBoost: number; reading: number; still: boolean },
) {
  const { scene, smooth, ov } = r;
  u.uSigA.value = scene.fromId === "signal" ? 1 : 0;
  u.uSigB.value = scene.toId === "signal" ? 1 : 0;
  u.uMorph.value = scene.m;
  u.uOverride.value = ov.value;
  u.uOverrideMix.value = ov.mix;
  u.uStagger.value = opts.reduced ? 0 : 0.45;
  u.uTurb.value = opts.reduced ? 0 : opts.still ? TURBULENCE_STILL : TURBULENCE * (1 - TURBULENCE_READING_SHARE * opts.reading);
  u.uDensity.value = smooth.density;
  u.uSpark.value = smooth.spark * (1 - SPARK_READING_CUT * opts.reading);
  u.uFog.value = smooth.fog;
  u.uEnergy.value = smooth.energy;
  u.uBrightness.value = smooth.brightness;
  u.uRightDim.value = smooth.rightDim;
  u.uAlpha.value = smooth.alpha;
  u.uHueMix.value = smooth.hueMix;

  // Sprite size folds the look multiplier into point scale without touching the resize-derived base.
  const aspect = size.width / size.height;
  const z = Math.min(BASE_CAMERA_Z * MAX_PULLBACK, Math.max(BASE_CAMERA_Z, smooth.fit / (HALF_TAN_FOV * aspect)));
  camera.position.z = z;
  const visibleH = 2 * z * HALF_TAN_FOV;
  // Director drawing: shrink to fit the height budget and lift clear of the caption lane, eased with the override.
  const fit = Math.min(1, (DRAWING_MAX_HEIGHT * visibleH) / FRAME_H);
  const heightShare = (FRAME_H * fit) / visibleH;
  const lift = Math.max(0, heightShare / 2 - (0.5 - DRAWING_BOTTOM_LIMIT)) + DRAWING_LIFT_MARGIN;
  const drawing = r.override.points ? ov.value : 0;
  u.uSpread.value = scene.spread * smooth.lscale * (1 + (fit - 1) * drawing);
  (u.uOffset.value as Vector3).set(smooth.lx * visibleH * aspect, (smooth.ly + lift * drawing) * visibleH, smooth.lz);
  u.uScale.value = (size.height / (2 * HALF_TAN_FOV)) * smooth.sizeMul;
  u.uSize.value = BASE_PARTICLE_SIZE * opts.sizeBoost * Math.pow(z / BASE_CAMERA_Z, 0.85);
}

/** Pointer is smoothed (spring back is the lag) and fades in only while it is over the page. */
function stepPointer(u: ShaderMaterial["uniforms"], p: Rig["pointer"], enabled: boolean, dt: number) {
  if (enabled) {
    const follow = Math.min(1, dt * POINTER_FOLLOW_RATE);
    p.x += (p.tx - p.x) * follow;
    p.y += (p.ty - p.y) * follow;
    (u.uPointer.value as Vector2).set(p.x, p.y);
  }
  const strength = enabled && p.active ? POINTER_STRENGTH : 0;
  u.uPointerStrength.value += (strength - u.uPointerStrength.value) * Math.min(1, dt * POINTER_FADE_RATE);
}


export type Field = {
  points: Points;
  resize(width: number, height: number, pixelRatio: number): void;
  /** Lean pipeline only: the bloom amount the point shader fakes. */
  setBloom(intensity: number): void;
  /** Advances one frame; true when another frame is needed. */
  step(f: FrameInfo): boolean;
  dispose(): void;
};

export function createField(camera: PerspectiveCamera, quality: FieldQuality, invalidate: () => void): Field {
  const { count, sizeBoost, reducedMotion, coarse, lean } = quality;
  const { geometry, material, attrs } = createFieldBuffers(count, lean);
  const points = new Points(geometry, material);
  points.frustumCulled = false;
  const u = material.uniforms;

  // Formations are generated in idle slices, only for chapters the visitor is about to reach.
  let cancelWarm = warmFormations(count, formationsAhead(signalStore.getState().chapter));
  const unsubscribeChapter = signalStore.subscribe((s, prev) => {
    if (s.chapter === prev.chapter) return;
    cancelWarm();
    cancelWarm = warmFormations(count, formationsAhead(s.chapter));
  });

  const now0 = performance.now();
  const r: Rig = {
    t: 0,
    chained: false,
    reading: createReading(),
    pointer: { x: 9, y: 9, tx: 9, ty: 9, active: 0 },
    intro: createIntro(now0),
    override: createOverrideState(),
    scene: createScene(),
    smooth: createSmooth(),
    adapt: createAdapt(now0, count),
    fromId: "noise",
    toId: "noise",
    spreadNow: INTRO_SPREAD,
    ov: { value: 0, mix: 0 },
    globe: createGlobeRig(),
  };
  // Dev flags fold to `false` in production builds, string literals included.
  const noAdapt = process.env.NODE_ENV !== "production" && devFlag("noadapt");
  const holdIntro = process.env.NODE_ENV !== "production" && devFlag("introhold");
  let width = 1;
  let height = 1;

  const formationAttr = (id: FormationId) => {
    const key = `f:${id}`;
    let a = attrs.get(key);
    if (!a) {
      a = new BufferAttribute(getFormation(id, count), 3);
      attrs.set(key, a);
    }
    return a;
  };

  const pointsCache = new WeakMap<Float32Array, BufferAttribute>();
  const overrideAttr = (o: SignalOverride) => {
    if (o.kind === "formation") return formationAttr(o.id);
    let a = pointsCache.get(o.points);
    if (!a) {
      a = new BufferAttribute(prepareCustomPoints(o.points, count), 3);
      pointsCache.set(o.points, a);
    }
    return a;
  };

  // Pointer tracking (window-level; the canvas itself is pointer-events: none).
  const detach: Array<() => void> = [];
  if (!reducedMotion && !coarse) {
    const p = r.pointer;
    const move = (e: PointerEvent) => {
      p.tx = (e.clientX / window.innerWidth) * 2 - 1;
      p.ty = -((e.clientY / window.innerHeight) * 2 - 1);
      p.active = 1;
    };
    const leave = () => {
      p.active = 0;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    detach.push(() => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    });
  }
  // Reduced motion renders on demand: any store change (scroll, Director) wakes the loop.
  if (reducedMotion) {
    detach.push(signalStore.subscribe(() => invalidate()));
    detach.push(onGlobeStory(invalidate));
  }

  /** Swap position/aB buffers only when formation ids change. */
  const bindFormations = (scene: Scene) => {
    if (scene.fromId !== r.fromId) {
      geometry.setAttribute("position", formationAttr(scene.fromId));
      r.fromId = scene.fromId;
    }
    if (scene.toId !== r.toId) {
      geometry.setAttribute("aB", formationAttr(scene.toId));
      r.toId = scene.toId;
    }
  };

  /** Director override: ping-pong between slots C and D. Writes the eased override and slot mix into `out`. */
  const stepOverride = (o: OverrideState, s: SignalState, now: number, out: { value: number; mix: number }) => {
    if (s.override !== o.last) {
      const dur = reducedMotion ? OVERRIDE_MS_REDUCED : OVERRIDE_MS;
      o.last = s.override;
      if (s.override) o.points = s.override.kind === "points";
      if (s.override) {
        const attr = overrideAttr(s.override);
        const active = o.value.target > 0.5 || o.value.value > 0.01;
        if (!active) {
          geometry.setAttribute("aC", attr);
          o.mix.snap(0);
          o.shownSlot = 0;
        } else if (o.mix.settled) {
          geometry.setAttribute(o.shownSlot === 0 ? "aD" : "aC", attr);
          o.shownSlot = o.shownSlot === 0 ? 1 : 0;
          o.mix.go(o.shownSlot, now, dur);
        } else {
          geometry.setAttribute(o.shownSlot === 0 ? "aC" : "aD", attr);
        }
        o.value.go(1, now, dur);
      } else {
        o.value.go(0, now, dur);
      }
    }
    out.value = o.value.step(now);
    out.mix = o.mix.step(now);
  };

  return {
    points,
    resize(w, h, pixelRatio) {
      width = w;
      height = h;
      camera.fov = CAMERA_FOV;
      camera.updateProjectionMatrix();
      u.uAspect.value = w / h;
      u.uPixelRatio.value = pixelRatio;
    },
    setBloom(intensity) {
      u.uBloom.value = intensity;
    },
    step({ delta, now }) {
      const s = signalStore.getState();
      const dt = r.chained ? Math.min(delta, MAX_DT) : RESUME_DT;
      const aspect = width / height;
      const { scene, smooth } = r;

      const still = !chapterPresence.present;
      const reading = reducedMotion ? 1 : stepReading(r.reading, window.scrollY, dt, still);
      fieldMotion.reading = reading;
      fieldMotion.timeScale = timeScaleFor(reading, still);
      if (!reducedMotion) r.t += dt * fieldMotion.timeScale;
      u.uTime.value = reducedMotion ? REDUCED_SHADER_TIME : r.t;
      recordFrame();

      if (!reducedMotion && !noAdapt) {
        const next = adaptQuality(r.adapt, r.chained ? delta : 0, now, count);
        if (next !== null) {
          geometry.setDrawRange(0, next);
          patchFieldStatus({ activeCount: next });
        }
      }

      resolveScroll(scene, s, aspect, chapterPresence.present);
      stepIntro(r.intro, scene, now, {
        ready: s.ready,
        reduced: reducedMotion,
        hold: holdIntro,
        skip: !chapterPresence.present,
        spreadNow: r.spreadNow,
        brightnessNow: smooth.brightness,
      });
      r.spreadNow = scene.spread;
      const reducedGap = reducedMotion && r.intro.phase === "done" ? settleReduced(smooth, scene, dt) : 0;

      bindFormations(scene);
      stepOverride(r.override, s, now, r.ov);
      blendLook(scene, smooth, r.ov.value, reducedMotion, reading);
      const lookGap = smoothLook(smooth, scene, s.energy, dt);

      const hasHue = !!s.hue && parseHex(s.hue, u.uHueColor.value as Color);
      const hueGap = stepHue(smooth, hasHue, dt);
      stepPointer(u, r.pointer, !reducedMotion && !coarse, dt);
      u.uGlobeA.value = scene.fromId === "globe" ? 1 : 0;
      u.uGlobeB.value = scene.toId === "globe" ? 1 : 0;
      u.uOvGlobe.value = s.override?.kind === "formation" && s.override.id === "globe" ? 1 : 0;
      const globeMoving = stepGlobe(r.globe, u, now, reducedMotion);
      writeUniforms(u, camera, { width, height }, r, { reduced: reducedMotion, sizeBoost, reading, still });

      // Frame loop is on demand: keep it going while anything moves, and always when motion is allowed.
      const keepGoing = !reducedMotion || globeMoving || isSettling({ look: lookGap, reducedMorph: reducedGap, hue: hueGap }, r.intro, r.override);
      r.chained = keepGoing;
      return keepGoing;
    },
    dispose() {
      cancelWarm();
      unsubscribeChapter();
      detach.forEach((d) => d());
      geometry.dispose();
      material.dispose();
    },
  };
}
