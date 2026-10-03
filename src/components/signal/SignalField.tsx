"use client";

import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { CHAPTERS, chapterById } from "@/lib/chapters";
import type { FormationId } from "@/lib/director/protocol";
import { signalStore, type SignalOverride } from "@/lib/signal-store";
import { getFormation, prepareCustomPoints, signalAttributes, signalLayout, signalRotation, warmFormations } from "./formations";
import { CHAPTER_LOOK, CHAPTER_LOOK_MOBILE, FORMATION_LOOK, NO_CHAPTER_LOOK, OVERRIDE_LOOK } from "./look";
import { FRAGMENT, VERTEX } from "./shaders";

export type FieldQuality = { count: number; sizeBoost: number; reducedMotion: boolean; coarse: boolean };

const OVERRIDE_SECONDS = 1.6;
const OVERRIDE_SECONDS_REDUCED = 0.4;
const INTRO_MORPH_SECONDS = 2.2;
const INTRO_TIMEOUT_MS = 4000;
const INTRO_SPREAD = 2.6;
const INTRO_CONVERGE_SECONDS = 4.2;
const INTRO_MIN_HOLD_SECONDS = 1.2;
const PARTICLE_WORLD_SIZE = 0.042;
const MAX_DT = 0.25;
const CAMERA_FOV = 38;
const BASE_CAMERA_Z = 7;
const MAX_PULLBACK = 2.8;
const HALF_TAN_FOV = Math.tan((CAMERA_FOV * Math.PI) / 360);

const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);
const clamp01 = (t: number) => (t < 0 ? 0 : t > 1 ? 1 : t);

/** A scalar that eases from its current value to a target over real time. No allocation per frame. */
class Tween {
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
  go(to: number, now: number, dur: number) {
    this.from = this.value;
    this.to = to;
    this.t0 = now;
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

function parseHex(hex: string, out: THREE.Color): boolean {
  if (!/^#?[0-9a-f]{3}([0-9a-f]{3})?$/i.test(hex.trim())) return false;
  out.set(hex.startsWith("#") ? hex : `#${hex}`);
  return true;
}

export function SignalField({ quality }: { quality: FieldQuality }) {
  const { count, sizeBoost, reducedMotion, coarse } = quality;
  const size = useThree((s) => s.size);
  const viewport = useThree((s) => s.viewport);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const gl = useThree((s) => s.gl);

  const pointsRef = useRef<THREE.Points>(null);

  const { geometry, material, attrs } = useMemo(() => {
    const geo = new THREE.BufferGeometry();
    const layout = signalLayout(count);
    const rand = new Float32Array(count * 4);
    for (let i = 0; i < count; i++) {
      rand[i * 4] = Math.random();
      rand[i * 4 + 1] = 0.6 + Math.random() * 0.8;
      rand[i * 4 + 2] = Math.random();
      rand[i * 4 + 3] = Math.random();
    }
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 4));
    geo.setAttribute("aSig", new THREE.BufferAttribute(signalAttributes(count), 4));
    // Placeholder so the geometry is valid before the first formation lands.
    const noise = getFormation("noise", count);
    const noiseAttr = new THREE.BufferAttribute(noise, 3);
    geo.setAttribute("position", noiseAttr);
    geo.setAttribute("aB", noiseAttr);
    geo.setAttribute("aC", noiseAttr);
    geo.setAttribute("aD", noiseAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 40);

    const mat = new THREE.ShaderMaterial({
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      blending: THREE.AdditiveBlending,
      uniforms: {
        uMorph: { value: 0 },
        uOverride: { value: 0 },
        uOverrideMix: { value: 0 },
        uTime: { value: 0 },
        uEnergy: { value: 0 },
        uStagger: { value: 0.45 },
        uTurb: { value: 1 },
        uSpread: { value: 1 },
        uPointer: { value: new THREE.Vector2(9, 9) },
        uPointerStrength: { value: 0 },
        uAspect: { value: 1 },
        uScale: { value: 1000 },
        uSize: { value: PARTICLE_WORLD_SIZE },
        uPixelRatio: { value: 1 },
        uOffset: { value: new THREE.Vector3() },
        uFog: { value: 0.09 },
        uSigA: { value: 0 },
        uSigB: { value: 0 },
        uSigDims: { value: new THREE.Vector4(layout.width, layout.depth, layout.wavelength, layout.amplitude) },
        uSigParam: { value: new THREE.Vector4(layout.noise, layout.phasePerLine, 0, 0) },
        uSigRot: { value: new THREE.Matrix3().set(...(signalRotation(layout) as [number, number, number, number, number, number, number, number, number])) },
        uAlpha: { value: 0.5 },
        uBrightness: { value: 1 },
        uHueColor: { value: new THREE.Color("#8b7bff") },
        uHueMix: { value: 0 },
      },
    });
    return { geometry: geo, material: mat, attrs: new Map<string, THREE.BufferAttribute>([["f:noise", noiseAttr]]) };
  }, [count]);

  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);

  // Warm remaining formations in idle slices, never blocking the main thread.
  useEffect(() => warmFormations(count), [count]);

  const rig = useRef({
    t: 0,
    pointerX: 9,
    pointerY: 9,
    pointerTargetX: 9,
    pointerTargetY: 9,
    pointerActive: 0,
    introPhase: "wait" as "wait" | "morph" | "done",
    introStart: performance.now(),
    introMorphStart: 0,
    introSpread: 1,
    introBrightness: 0.3,
    spreadNow: INTRO_SPREAD,
    fromId: "noise" as FormationId,
    toId: "noise" as FormationId,
    lastOverride: null as SignalOverride | null,
    overrideTween: new Tween(0),
    mixTween: new Tween(0),
    shownSlot: 0 as 0 | 1,
    energy: 0,
    brightness: 0,
    lx: 0,
    ly: 0,
    lz: 0,
    lscale: 1,
    fog: 0.09,
    hasChapters: true,
    frame: 0,
    alpha: 0.5,
    sizeMul: 1,
    fit: 3,
    hueMix: 0,
    hueTarget: 0,
    smoothM: 0,
    activeCount: count,
    slowFrames: 0,
    fpsEma: 60,
    adaptAfter: performance.now() + 4000,
  });

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
    const r = rig.current;
    const move = (e: PointerEvent) => {
      r.pointerTargetX = (e.clientX / window.innerWidth) * 2 - 1;
      r.pointerTargetY = -((e.clientY / window.innerHeight) * 2 - 1);
      r.pointerActive = 1;
    };
    const leave = () => {
      r.pointerActive = 0;
    };
    window.addEventListener("pointermove", move, { passive: true });
    document.documentElement.addEventListener("pointerleave", leave);
    return () => {
      window.removeEventListener("pointermove", move);
      document.documentElement.removeEventListener("pointerleave", leave);
    };
  }, [reducedMotion, coarse]);

  // Static camera + pixel scale setup; distance is driven per frame from each formation's `fit`.
  useEffect(() => {
    camera.fov = CAMERA_FOV;
    camera.updateProjectionMatrix();
    const u = material.uniforms;
    u.uAspect.value = size.width / size.height;
    u.uPixelRatio.value = gl.getPixelRatio();
  }, [size, viewport, camera, gl, material]);

  useFrame((state, delta) => {
    const r = rig.current;
    const s = signalStore.getState();
    const u = material.uniforms;
    const now = performance.now();
    const dt = Math.min(delta, MAX_DT);
    r.t += dt;
    u.uTime.value = r.t;

    // ---- fps watchdog (adaptive draw range), opt out with ?noadapt
    if (delta > 0) r.fpsEma += (1 / delta - r.fpsEma) * 0.04;
    if (now > r.adaptAfter && !ADAPT_OFF) {
      r.slowFrames = r.fpsEma < 40 ? r.slowFrames + 1 : 0;
      if (r.slowFrames > 90 && r.activeCount > count * 0.4) {
        r.activeCount = Math.max(Math.floor(count * 0.4), Math.floor(r.activeCount * 0.8));
        geometry.setDrawRange(0, r.activeCount);
        r.slowFrames = 0;
        r.adaptAfter = now + 2500;
      }
    }

    // ---- which formations does scroll want?
    const chapter = chapterById(s.chapter);
    const idx = CHAPTERS.indexOf(chapter);
    const prev = CHAPTERS[Math.max(0, idx - 1)];
    let fromId = prev.formation;
    let toId = chapter.formation;
    let m = s.morph;
    const eb = m * m * (3 - 2 * m);
    const looks = size.width / size.height > 1.2 ? CHAPTER_LOOK : CHAPTER_LOOK_MOBILE;
    const lp = looks[prev.id];
    const lc = looks[chapter.id];
    let brightness = lp.brightness + (lc.brightness - lp.brightness) * eb;
    let lookX = lp.x + (lc.x - lp.x) * eb;
    let lookY = lp.y + (lc.y - lp.y) * eb;
    let lookZ = lp.z + (lc.z - lp.z) * eb;
    let lookScale = lp.scale + (lc.scale - lp.scale) * eb;
    if (idx === 0) fromId = toId;

    // Routes without chapters (case studies) settle into a dim noise drift.
    if (++r.frame % 20 === 1) r.hasChapters = document.querySelector("[data-chapter]") !== null;
    const noChapters = !r.hasChapters;
    if (noChapters) {
      fromId = "noise";
      toId = "noise";
      m = 0;
      brightness = NO_CHAPTER_LOOK.brightness;
      lookX = NO_CHAPTER_LOOK.x;
      lookY = NO_CHAPTER_LOOK.y;
      lookZ = NO_CHAPTER_LOOK.z;
      lookScale = NO_CHAPTER_LOOK.scale;
      r.introPhase = "done";
    }
    let introW = 1;

    // ---- intro: the preloader shows dim noise; when `ready` flips the noise flies into the scroll formation
    // (the signal field), left side first.
    let spread = 1;
    if (r.introPhase !== "done") {
      const waited = (now - r.introStart) / 1000;
      const ripe = waited > INTRO_MIN_HOLD_SECONDS;
      if (r.introPhase === "wait" && ripe && (s.ready || (!HOLD_INTRO && now - r.introStart > INTRO_TIMEOUT_MS))) {
        r.introPhase = "morph";
        r.introMorphStart = now;
        r.introSpread = r.spreadNow;
        r.introBrightness = r.brightness;
      }
      if (r.introPhase === "wait") {
        const conv = easeOut(clamp01(waited / INTRO_CONVERGE_SECONDS));
        spread = INTRO_SPREAD + (1 - INTRO_SPREAD) * conv;
        fromId = "noise";
        toId = "noise";
        m = 0;
        brightness = 0.16 + 0.14 * conv;
        introW = 0;
      } else {
        const p = clamp01((now - r.introMorphStart) / 1000 / (reducedMotion ? 0.4 : INTRO_MORPH_SECONDS));
        const e = easeInOut(p);
        fromId = "noise";
        m = e;
        brightness = r.introBrightness + (brightness - r.introBrightness) * e;
        spread = r.introSpread + (1 - r.introSpread) * e;
        introW = e;
        if (p >= 1) r.introPhase = "done";
      }
    }
    r.spreadNow = spread;

    // Reduced motion: formation swaps are quick settles, not scrubbed morphs.
    if (reducedMotion && r.introPhase === "done") {
      const target = m >= 0.5 ? 1 : 0;
      r.smoothM += (target - r.smoothM) * Math.min(1, dt * 7);
      if (Math.abs(r.smoothM - target) < 0.002) r.smoothM = target;
      m = r.smoothM;
    }

    // ---- swap buffers only when formation ids change
    if (fromId !== r.fromId) {
      geometry.setAttribute("position", formationAttr(fromId));
      r.fromId = fromId;
    }
    if (toId !== r.toId) {
      geometry.setAttribute("aB", formationAttr(toId));
      r.toId = toId;
    }

    // ---- Director override (ping-pong between slots C and D)
    if (s.override !== r.lastOverride) {
      const dur = reducedMotion ? OVERRIDE_SECONDS_REDUCED : OVERRIDE_SECONDS;
      const o = s.override;
      r.lastOverride = o;
      if (o) {
        const attr = overrideAttr(o);
        const active = r.overrideTween.target > 0.5 || r.overrideTween.value > 0.01;
        if (!active) {
          geometry.setAttribute("aC", attr);
          r.mixTween.snap(0);
          r.shownSlot = 0;
        } else if (r.mixTween.settled) {
          const hidden = r.shownSlot === 0 ? "aD" : "aC";
          geometry.setAttribute(hidden, attr);
          r.shownSlot = r.shownSlot === 0 ? 1 : 0;
          r.mixTween.go(r.shownSlot, now, dur);
        } else {
          geometry.setAttribute(r.shownSlot === 0 ? "aC" : "aD", attr);
        }
        r.overrideTween.go(1, now, dur);
      } else {
        r.overrideTween.go(0, now, dur);
      }
    }
    const ov = r.overrideTween.step(now);
    const ovMix = r.mixTween.step(now);

    // ---- look: per-formation sprite + per-chapter brightness, blended by morph
    const lookA = FORMATION_LOOK[fromId];
    const lookB = FORMATION_LOOK[toId];
    const mm = reducedMotion ? m : m * m * (3 - 2 * m);
    let alpha = lookA.alpha + (lookB.alpha - lookA.alpha) * mm;
    let fog = lookA.fog + (lookB.fog - lookA.fog) * mm;
    // Chapter look fades in with the intro and out while the Director's drawing owns the field.
    const calm = introW * (1 - ov);
    lookX *= calm;
    lookY *= calm;
    lookZ *= calm;
    lookScale = 1 + (lookScale - 1) * calm;
    // The Director (override or streaming energy) brings the field up to full light.
    brightness += (1 - brightness) * Math.min(1, r.energy * 1.5);
    let sizeMul = lookA.size + (lookB.size - lookA.size) * mm;
    let fit = lookA.fit + (lookB.fit - lookA.fit) * mm;
    brightness = brightness + (OVERRIDE_LOOK.brightness - brightness) * ov;
    alpha = alpha + (OVERRIDE_LOOK.alpha - alpha) * ov;
    sizeMul = sizeMul + (OVERRIDE_LOOK.size - sizeMul) * ov;
    fit = fit + (OVERRIDE_LOOK.fit - fit) * ov;
    fog = fog + (OVERRIDE_LOOK.fog - fog) * ov;
    // Light smoothing keeps brightness changes from flickering on jumpy scroll input.
    const k = Math.min(1, dt * 6);
    r.brightness += (brightness - r.brightness) * k;
    r.alpha += (alpha - r.alpha) * k;
    r.sizeMul += (sizeMul - r.sizeMul) * k;
    r.fit += (fit - r.fit) * k;
    r.fog += (fog - r.fog) * k;
    r.lx += (lookX - r.lx) * k;
    r.ly += (lookY - r.ly) * k;
    r.lz += (lookZ - r.lz) * k;
    r.lscale += (lookScale - r.lscale) * k;
    r.energy += (s.energy - r.energy) * Math.min(1, dt * 4);

    // ---- hue tint
    if (s.hue && parseHex(s.hue, u.uHueColor.value as THREE.Color)) r.hueTarget = 1;
    else r.hueTarget = 0;
    r.hueMix += (r.hueTarget - r.hueMix) * Math.min(1, dt * 2.5);

    // ---- pointer (smoothed; spring back is the lag)
    const strength = reducedMotion || coarse ? 0 : 0.2;
    if (strength > 0) {
      const follow = Math.min(1, dt * 9);
      r.pointerX += (r.pointerTargetX - r.pointerX) * follow;
      r.pointerY += (r.pointerTargetY - r.pointerY) * follow;
      (u.uPointer.value as THREE.Vector2).set(r.pointerX, r.pointerY);
    }
    u.uPointerStrength.value += ((r.pointerActive ? strength : 0) - u.uPointerStrength.value) * Math.min(1, dt * 5);

    u.uSigA.value = fromId === "signal" ? 1 : 0;
    u.uSigB.value = toId === "signal" ? 1 : 0;
    u.uMorph.value = m;
    u.uOverride.value = ov;
    u.uOverrideMix.value = ovMix;
    u.uStagger.value = reducedMotion ? 0 : 0.45;
    u.uTurb.value = reducedMotion ? 0 : 1;
    u.uSpread.value = spread * r.lscale;
    u.uFog.value = r.fog;
    u.uEnergy.value = r.energy;
    u.uBrightness.value = r.brightness;
    u.uAlpha.value = r.alpha;
    u.uHueMix.value = r.hueMix;
    // Sprite size: fold look multiplier into point scale without touching the resize-derived base.
    const aspect = size.width / size.height;
    const z = Math.min(BASE_CAMERA_Z * MAX_PULLBACK, Math.max(BASE_CAMERA_Z, r.fit / (HALF_TAN_FOV * aspect)));
    camera.position.z = z;
    const visibleH = 2 * z * HALF_TAN_FOV;
    (u.uOffset.value as THREE.Vector3).set(r.lx * visibleH * aspect, r.ly * visibleH, r.lz);
    u.uScale.value = (size.height / (2 * HALF_TAN_FOV)) * r.sizeMul;
    u.uSize.value = PARTICLE_WORLD_SIZE * sizeBoost * Math.pow(z / BASE_CAMERA_Z, 0.85);
  });

  return <points ref={pointsRef} geometry={geometry} material={material} frustumCulled={false} />;
}

/** Dev: ?introhold keeps the preloader state (dim noise) until `ready` is set by hand. */
const HOLD_INTRO = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("introhold");
const ADAPT_OFF = typeof window !== "undefined" && new URLSearchParams(window.location.search).has("noadapt");
