import type { ShaderMaterial, Vector4 } from "three";
import { Tween } from "./ease";
import { DEG, defaultBasis, dot, toVec, type V3 } from "./formations/globeView";

/**
 * The hidden visitors globe, as the field sees it. The overlay (see components/visits) writes the hot spots here
 * and holds the Director's override on the globe formation; the field reads this every frame (no subscription in
 * the render loop), like `globeStory`. Hot spots live in the globe's baked frame, so the shader can compare a
 * particle's position with them before it turns the globe.
 */

/** Hot spots the point shader loops over. The busiest cells win when there are more. */
export const MAX_GLOW_CELLS = 48;
const SPIN_DEG_PER_S = 5;
const TILT_BASE_DEG = 18;
const TILT_FOLLOW = 0.3;
const FADE_MS = 1100;
/** Weight of a one-visit cell, so a lone visitor still glows; the busiest cell is 1. */
const WEIGHT_FLOOR = 0.3;
const FLARE_DELAY_MS = 1200;
const FLARE_MS = 2800;
/** `uYou.w` once the flare is over: a quiet beacon stays on the viewer's cell. Negative: no viewer. */
const YOU_RESTING = 2;

export type GlowInput = {
  /** [lat, lon, count] per cell, any order. */
  cells: ReadonlyArray<readonly [number, number, number]>;
  /** The viewer's own cell, if known. */
  you: { lat: number; lon: number } | null;
  /** Pulse, spin and flare. Off under reduced motion: the hot spots then sit still. */
  motion: boolean;
};

type Glow = {
  on: boolean;
  version: number;
  motion: boolean;
  /** Packed vec4 per hot spot: baked unit vector and weight. A zero weight ends the list. */
  cells: Float32Array;
  you: { x: number; y: number; z: number; lat: number; lon: number } | null;
  focusLat: number;
  focusLon: number;
  /** performance.now() the glow was shown at; the flare is timed from it. */
  shownAt: number;
};

export const visitsGlow: Glow = {
  on: false,
  version: 0,
  motion: true,
  cells: new Float32Array(MAX_GLOW_CELLS * 4),
  you: null,
  focusLat: 20,
  focusLon: 0,
  shownAt: 0,
};

type Listener = () => void;
const listeners = new Set<Listener>();
const notify = () => listeners.forEach((l) => l());

/** For the field: wakes an on-demand renderer when the glow is shown, changed or hidden. Returns an unsubscribe. */
export function onVisitsGlow(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const DEFAULT = defaultBasis();
const DEFAULT_ROWS = [DEFAULT.right, DEFAULT.up, DEFAULT.forward];
/** Scratch rows of the requested view, [right, up, forward] in earth coordinates. */
const view = new Float64Array(9);

/** A coordinate in the globe's baked frame (what `formations/globe.ts` writes before the shader turns it). */
function baked(lat: number, lon: number): V3 {
  const v = toVec(lat, lon);
  return [dot(v, DEFAULT.right), dot(v, DEFAULT.up), dot(v, DEFAULT.forward)];
}

/** Weight 0..1 by log(count): the busiest cell is 1, a single visit is WEIGHT_FLOOR. */
export function glowWeight(count: number, max: number): number {
  if (count <= 0 || max <= 0) return 0;
  return WEIGHT_FLOOR + (1 - WEIGHT_FLOOR) * (Math.log1p(count) / Math.log1p(max));
}

/** Shows the glow: packs the busiest cells, aims the globe at the viewer (or at the busiest cell), starts the flare clock. */
export function showVisitsGlow(input: GlowInput, now = performance.now()) {
  const top = [...input.cells].filter((c) => c[2] > 0).sort((a, b) => b[2] - a[2]).slice(0, MAX_GLOW_CELLS);
  const max = top.length ? top[0][2] : 0;
  visitsGlow.cells.fill(0);
  top.forEach(([lat, lon, count], i) => {
    const v = baked(lat, lon);
    visitsGlow.cells.set([v[0], v[1], v[2], glowWeight(count, max)], i * 4);
  });
  const you = input.you ? baked(input.you.lat, input.you.lon) : null;
  visitsGlow.you = you && input.you ? { x: you[0], y: you[1], z: you[2], lat: input.you.lat, lon: input.you.lon } : null;
  const focus = input.you ?? (top.length ? { lat: top[0][0], lon: top[0][1] } : { lat: 20, lon: 0 });
  visitsGlow.focusLat = focus.lat;
  visitsGlow.focusLon = focus.lon;
  visitsGlow.motion = input.motion;
  visitsGlow.shownAt = now;
  visitsGlow.on = true;
  visitsGlow.version += 1;
  notify();
}

export function hideVisitsGlow() {
  if (!visitsGlow.on) return;
  visitsGlow.on = false;
  visitsGlow.version += 1;
  notify();
}

export type VisitsRig = {
  /** 0 off, 1 the glow is fully in. */
  mix: Tween;
  /** Degrees the globe has turned since it was shown. */
  spin: number;
  lastNow: number;
  seenVersion: number;
  /** Scratch for the rotation, so a frame allocates nothing. */
  m: Float64Array;
};

export function createVisitsRig(): VisitsRig {
  return { mix: new Tween(0), spin: 0, lastNow: 0, seenVersion: -1, m: new Float64Array(9) };
}

/**
 * Row-major 3x3 that turns the baked globe so (lat, lon) is centred, north up. The same construction as
 * `storyRotation`, for one arbitrary view. Writes `out`, allocates nothing.
 */
export function visitRotation(out: Float64Array, latDeg: number, lonDeg: number) {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  const fx = Math.cos(la) * Math.sin(lo);
  const fy = Math.sin(la);
  const fz = Math.cos(la) * Math.cos(lo);
  let ux = -fy * fx;
  let uy = 1 - fy * fy;
  let uz = -fy * fz;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;
  const rx = uy * fz - uz * fy;
  const ry = uz * fx - ux * fz;
  const rz = ux * fy - uy * fx;
  view[0] = rx;
  view[1] = ry;
  view[2] = rz;
  view[3] = ux;
  view[4] = uy;
  view[5] = uz;
  view[6] = fx;
  view[7] = fy;
  view[8] = fz;
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = DEFAULT_ROWS[j];
      out[i * 3 + j] = view[i * 3] * r[0] + view[i * 3 + 1] * r[1] + view[i * 3 + 2] * r[2];
    }
  }
}

/**
 * Eases the glow in and out, turns the globe, and writes the visits uniforms. Returns true while anything is
 * still moving (the on-demand renderer keeps asking for frames; with motion on the glow itself is always moving).
 */
export function stepVisits(rig: VisitsRig, u: ShaderMaterial["uniforms"], now: number, reduced: boolean): boolean {
  const g = visitsGlow;
  if (rig.seenVersion !== g.version) {
    rig.seenVersion = g.version;
    if (g.on) {
      rig.spin = 0;
      rig.lastNow = now;
    }
    if (reduced) rig.mix.snap(g.on ? 1 : 0);
    else rig.mix.go(g.on ? 1 : 0, now, FADE_MS);
  }
  const mix = rig.mix.step(now);
  const dt = Math.min(0.1, Math.max(0, (now - rig.lastNow) / 1000));
  rig.lastNow = now;
  const animate = g.motion && !reduced;
  if (animate) rig.spin += SPIN_DEG_PER_S * dt * mix;

  u.uVisit.value = mix;
  u.uVisitPulse.value = animate ? 1 : 0;
  if (mix <= 0.0005) return !rig.mix.settled;

  const tilt = TILT_BASE_DEG + Math.max(-30, Math.min(60, g.focusLat)) * TILT_FOLLOW;
  visitRotation(rig.m, tilt, g.focusLon + rig.spin);
  const m = rig.m;
  (u.uVisitRot.value as { set: (...n: number[]) => void }).set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
  (u.uCells.value as Float32Array).set(g.cells);

  const you = u.uYou.value as Vector4;
  if (!g.you) you.set(0, 0, 1, -1);
  else {
    // Flare progress 0..1; before it starts, after it ends and without motion the viewer's cell wears the quiet beacon.
    const t = (now - g.shownAt - FLARE_DELAY_MS) / FLARE_MS;
    you.set(g.you.x, g.you.y, g.you.z, !animate || t < 0 || t >= 1 ? YOU_RESTING : t);
  }
  return !rig.mix.settled || animate;
}
