import type { Matrix3, ShaderMaterial, Vector2 } from "three";
import { Tween, smoothstep01 } from "./ease";
import { storyRotation } from "./formations/globeView";
import { globeStory } from "./globeStory";

/** Milliseconds, like the `now` the field is stepped with. */
const TURN_MS = 2600;
const ARC_DRAW_MS = 2200;
const ARC_DRAW_DELAY_MS = 120;
const ARC_UNDRAW_MS = 1500;
const MODE_MS = 1400;
/** The origin marker keeps this much light once the story has moved on to Boston. */
const ORIGIN_MARK_FLOOR = 0.55;
/** Boston lights as the arc arrives: over the last of the draw. */
const ARRIVAL_FROM = 0.78;

export type GlobeRig = {
  /** 0 India facing, 1 Boston facing. */
  turn: Tween;
  /** 0 arc hidden, 1 fully drawn. */
  arc: Tween;
  /** 0 default view (no story), 1 story views. */
  mode: Tween;
  focusSeen: typeof globeStory.focus;
  arcSeen: boolean;
  primed: boolean;
  /** Scratch for the rotation, so a frame allocates nothing. */
  m: Float64Array;
};

export function createGlobeRig(): GlobeRig {
  return { turn: new Tween(0), arc: new Tween(1), mode: new Tween(0), focusSeen: null, arcSeen: false, primed: false, m: new Float64Array(9) };
}

/** Eases (or, under reduced motion and on the first frame, snaps) the globe toward the story. */
function retarget(g: GlobeRig, now: number, reduced: boolean) {
  const { focus, arc } = globeStory;
  const active = focus !== null;
  const snap = reduced || !g.primed;
  g.primed = true;
  g.focusSeen = focus;
  g.arcSeen = arc;

  const turnTo = focus === "boston" ? 1 : focus === "bangalore" ? 0 : g.turn.target;
  const arcTo = active ? (arc ? 1 : 0) : 1;
  if (snap) {
    g.turn.snap(turnTo);
    g.arc.snap(arcTo);
    g.mode.snap(active ? 1 : 0);
    return;
  }
  if (turnTo !== g.turn.target) g.turn.go(turnTo, now, TURN_MS);
  if (arcTo !== g.arc.target) {
    if (arcTo > g.arc.target) g.arc.go(arcTo, now, ARC_DRAW_MS, ARC_DRAW_DELAY_MS);
    else g.arc.go(arcTo, now, ARC_UNDRAW_MS);
  }
  const modeTo = active ? 1 : 0;
  if (modeTo !== g.mode.target) g.mode.go(modeTo, now, MODE_MS);
}

/**
 * Advances the story tweens and writes the globe uniforms. Returns true while the globe is still turning
 * or drawing (the on-demand renderer keeps asking for frames).
 */
export function stepGlobe(g: GlobeRig, u: ShaderMaterial["uniforms"], now: number, reduced: boolean): boolean {
  if (!g.primed || g.focusSeen !== globeStory.focus || g.arcSeen !== globeStory.arc) retarget(g, now, reduced);
  const turn = g.turn.step(now);
  const arc = g.arc.step(now);
  const mode = g.mode.step(now);

  storyRotation(g.m, turn, mode);
  const m = g.m;
  (u.uGlobeRot.value as Matrix3).set(m[0], m[1], m[2], m[3], m[4], m[5], m[6], m[7], m[8]);
  u.uArc.value = arc;
  // Overview (no story) lights both cities; the story lights the origin always and Boston once the arc lands.
  const arrived = smoothstep01(Math.min(1, Math.max(0, (arc - ARRIVAL_FROM) / (1 - ARRIVAL_FROM))));
  const origin = 1 - (1 - ORIGIN_MARK_FLOOR) * turn;
  (u.uMark.value as Vector2).set(origin + (1 - origin) * (1 - mode), arrived + (1 - arrived) * (1 - mode));
  return !(g.turn.settled && g.arc.settled && g.mode.settled);
}
