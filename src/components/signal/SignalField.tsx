"use client";

import { useEffect, useMemo, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CHAPTERS, chapterById } from "@/lib/chapters";
import type { FormationId } from "@/lib/director/protocol";
import { signalStore, type SignalOverride, type SignalState } from "@/lib/signal-store";
import { adaptQuality } from "./adaptive";
import { chapterPresence } from "./chapterPresence";
import { devFlag, recordFrame } from "./devtools";
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
import { getFormation, prepareCustomPoints, warmFormations } from "./formations";

export type FieldQuality = { count: number; sizeBoost: number; reducedMotion: boolean; coarse: boolean; maxDpr: number };

const OVERRIDE_SECONDS = 1.6;
const OVERRIDE_SECONDS_REDUCED = 0.4;
const MAX_DT = 0.25;
/** First frame after an idle stretch (on-demand rendering): treat it as one 60 Hz step, not the whole gap. */
const RESUME_DT = 1 / 60;
const CAMERA_FOV = 38;
const BASE_CAMERA_Z = 7;
const MAX_PULLBACK = 2.8;
const HALF_TAN_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);
const POINTER_STRENGTH = 0.2;
const POINTER_FOLLOW_RATE = 9;
const POINTER_FADE_RATE = 5;
/** Shader time is frozen under reduced motion so a settled scene is a still image. */
const REDUCED_SHADER_TIME = 3;
/** Formations generated ahead of the visitor: the current chapter's and the next two. */
const WARM_AHEAD = 2;

function parseHex(hex: string, out: THREE.Color): boolean {
  if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex.trim())) return false;
  out.set(hex.startsWith("#") ? hex : `#${hex}`);
  return true;
}

/** Formations to have ready for a chapter: its own, then the next ones in scroll order. */
function formationsAhead(chapterId: SignalState["chapter"]): FormationId[] {
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
};

/** Writes every uniform the shader reads this frame, plus camera distance and sprite scale. */
function writeUniforms(
  u: THREE.ShaderMaterial["uniforms"],
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  r: Rig,
  opts: { reduced: boolean; sizeBoost: number },
) {
  const { scene, smooth, ov } = r;
  u.uSigA.value = scene.fromId === "signal" ? 1 : 0;
  u.uSigB.value = scene.toId === "signal" ? 1 : 0;
  u.uMorph.value = scene.m;
  u.uOverride.value = ov.value;
  u.uOverrideMix.value = ov.mix;
  u.uStagger.value = opts.reduced ? 0 : 0.45;
  u.uTurb.value = opts.reduced ? 0 : 1;
  u.uSpread.value = scene.spread * smooth.lscale;
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
  (u.uOffset.value as THREE.Vector3).set(smooth.lx * visibleH * aspect, smooth.ly * visibleH, smooth.lz);
  u.uScale.value = (size.height / (2 * HALF_TAN_FOV)) * smooth.sizeMul;
  u.uSize.value = BASE_PARTICLE_SIZE * opts.sizeBoost * Math.pow(z / BASE_CAMERA_Z, 0.85);
}

/** Pointer is smoothed (spring back is the lag) and fades in only while it is over the page. */
function stepPointer(u: THREE.ShaderMaterial["uniforms"], p: Rig["pointer"], enabled: boolean, dt: number) {
  if (enabled) {
    const follow = Math.min(1, dt * POINTER_FOLLOW_RATE);
    p.x += (p.tx - p.x) * follow;
    p.y += (p.ty - p.y) * follow;
    (u.uPointer.value as THREE.Vector2).set(p.x, p.y);
  }
  const strength = enabled && p.active ? POINTER_STRENGTH : 0;
  u.uPointerStrength.value += (strength - u.uPointerStrength.value) * Math.min(1, dt * POINTER_FADE_RATE);
}

export function SignalField({ quality }: { quality: FieldQuality }) {
  const { count, sizeBoost, reducedMotion, coarse } = quality;
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);
  const invalidate = useThree((s) => s.invalidate);

  const { geometry, material, attrs } = useMemo(() => createFieldBuffers(count), [count]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // Formations are generated in idle slices, only for chapters the visitor is about to reach.
  useEffect(() => {
    let cancel = warmFormations(count, formationsAhead(signalStore.getState().chapter));
    const unsubscribe = signalStore.subscribe((s, prev) => {
      if (s.chapter === prev.chapter) return;
      cancel();
      cancel = warmFormations(count, formationsAhead(s.chapter));
    });
    return () => {
      cancel();
      unsubscribe();
    };
  }, [count]);

  const [r] = useState<Rig>(() => {
    const now = performance.now();
    return {
      t: 0,
      chained: false,
      pointer: { x: 9, y: 9, tx: 9, ty: 9, active: 0 },
      intro: createIntro(now),
      override: createOverrideState(),
      scene: createScene(),
      smooth: createSmooth(),
      adapt: createAdapt(now, count),
      fromId: "noise",
      toId: "noise",
      spreadNow: INTRO_SPREAD,
      ov: { value: 0, mix: 0 },
    };
  });
  // Dev flags fold to `false` in production builds, string literals included.
  const noAdapt = useMemo(() => process.env.NODE_ENV !== "production" && devFlag("noadapt"), []);
  const holdIntro = useMemo(() => process.env.NODE_ENV !== "production" && devFlag("introhold"), []);

  const formationAttr = (id: FormationId) => {
    const key = `f:${id}`;
    let a = attrs.get(key);
    if (!a) {
      a = new THREE.BufferAttribute(getFormation(id, count), 3);
      attrs.set(key, a);
    }
    return a;
  };

  const pointsCache = useMemo(() => new WeakMap<Float32Array, THREE.BufferAttribute>(), []);
  const overrideAttr = (o: SignalOverride) => {
    if (o.kind === "formation") return formationAttr(o.id);
    let a = pointsCache.get(o.points);
    if (!a) {
      a = new THREE.BufferAttribute(prepareCustomPoints(o.points, count), 3);
      pointsCache.set(o.points, a);
    }
    return a;
  };

  // Pointer tracking (window-level; the canvas itself is pointer-events: none).
  useEffect(() => {
    if (reducedMotion || coarse) return;
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
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reducedMotion, coarse, r]);

  // Reduced motion renders on demand: any store change (scroll, Director) wakes the loop.
  useEffect(() => {
    if (!reducedMotion) return;
    return signalStore.subscribe(() => invalidate());
  }, [reducedMotion, invalidate]);

  // Static camera + pixel scale setup; distance is driven per frame from each formation's `fit`.
  useEffect(() => {
    camera.fov = CAMERA_FOV;
    camera.updateProjectionMatrix();
    const u = material.uniforms;
    u.uAspect.value = size.width / size.height;
    u.uPixelRatio.value = gl.getPixelRatio();
    invalidate();
  }, [size, viewport, camera, gl, material, invalidate]);

  /** Swap position/aB buffers only when formation ids change. */
  const bindFormations = (scene: Scene, r: Rig) => {
    if (scene.fromId !== r.fromId) {
      geometry.setAttribute("position", formationAttr(scene.fromId));
      r.fromId = scene.fromId;
    }
    if (scene.toId !== r.toId) {
      geometry.setAttribute("aB", formationAttr(scene.toId));
      r.toId = scene.toId;
    }
  };

  /** Director override: ping-pong between slots C and D. Returns the eased override and slot mix. */
  const stepOverride = (o: OverrideState, s: SignalState, now: number, out: { value: number; mix: number }) => {
    if (s.override !== o.last) {
      const dur = reducedMotion ? OVERRIDE_SECONDS_REDUCED : OVERRIDE_SECONDS;
      o.last = s.override;
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

  useFrame((state, delta) => {
    const s = signalStore.getState();
    const u = material.uniforms;
    const now = performance.now();
    const dt = r.chained ? Math.min(delta, MAX_DT) : RESUME_DT;
    const aspect = size.width / size.height;
    const { scene, smooth } = r;

    if (!reducedMotion) r.t += dt;
    u.uTime.value = reducedMotion ? REDUCED_SHADER_TIME : r.t;
    recordFrame();

    if (!reducedMotion && !noAdapt) {
      const next = adaptQuality(r.adapt, r.chained ? delta : 0, now, count);
      if (next !== null) geometry.setDrawRange(0, next);
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

    bindFormations(scene, r);
    stepOverride(r.override, s, now, r.ov);
    blendLook(scene, smooth, r.ov.value, reducedMotion);
    const lookGap = smoothLook(smooth, scene, s.energy, dt);

    const hasHue = !!s.hue && parseHex(s.hue, u.uHueColor.value as THREE.Color);
    const hueGap = stepHue(smooth, hasHue, dt);
    stepPointer(u, r.pointer, !reducedMotion && !coarse, dt);
    writeUniforms(u, camera, size, r, { reduced: reducedMotion, sizeBoost });

    // Frame loop is on demand: keep it going while anything moves, and always when motion is allowed.
    const keepGoing = !reducedMotion || isSettling({ look: lookGap, reducedMorph: reducedGap, hue: hueGap }, r.intro, r.override);
    r.chained = keepGoing;
    if (keepGoing) state.invalidate();
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
