import { Color, PerspectiveCamera, Scene, WebGLRenderer } from "three";
import { signalStore } from "@/lib/signal-store";
import { createField, formationsAhead, type Field } from "./field";
import { requestFormations } from "./formations";
import type { FieldQuality } from "./fieldTypes";
import type { Fx } from "./fx";
import { fieldMotion } from "./readingMode";
import { CHAPTER_BLOOM, DEFAULT_BLOOM, OVERRIDE_BLOOM } from "./look";

const ORBIT_SPEED = 0.11;
const ORBIT_YAW = 0.16;
const ORBIT_PITCH = 0.05;
const PARALLAX = 0.45;
const BLOOM_BASE = 0.65;
const BLOOM_FOLLOW_RATE = 4;
const BLOOM_SETTLED = 0.002;
/** Bloom removed at full reading mode. */
const BLOOM_READING_CUT = 0.25;
/** Orbit and parallax fade this much at full reading mode. */
const MOTION_READING_CUT = 0.55;
const MAX_DT = 0.25;
const FIRST_FRAMES = 3;
const CLEAR_COLOR = "#060509";
/** Phones: browser chrome resizes the fixed canvas many times mid-scroll, so settle before reallocating buffers. */
const COARSE_RESIZE_DEBOUNCE_MS = 200;
const FALLBACK_FRAME_DT = 1 / 60;
/** Longest boot waits for the formation worker before generating on the main thread instead. */
const FORMATION_WAIT_MS = 400;

export type EngineHooks = {
  onReady: () => void;
  onContextLost: () => void;
  onContextRestored: () => void;
  onError: (error: unknown) => void;
};

export type Engine = { dispose: () => void };

const yieldToMain = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type Rig = { orbit: number; bloomW: number; px: number; py: number; sx: number; sy: number };

/** Slow idle orbit plus mouse parallax; returns the bloom amount for this frame and whether it is still easing. */
function stepRig(rig: Rig, camera: PerspectiveCamera, delta: number, reducedMotion: boolean): { bloom: number; easing: boolean } {
  const sig = signalStore.getState();
  const drawing = sig.override?.kind === "points";
  const bloomTarget = (drawing ? OVERRIDE_BLOOM : (CHAPTER_BLOOM[sig.chapter] ?? DEFAULT_BLOOM)) * (1 - BLOOM_READING_CUT * fieldMotion.reading);
  const dt = Math.min(delta, MAX_DT);
  rig.bloomW += (bloomTarget - rig.bloomW) * Math.min(1, dt * BLOOM_FOLLOW_RATE);
  const out = { bloom: BLOOM_BASE * rig.bloomW, easing: Math.abs(bloomTarget - rig.bloomW) > BLOOM_SETTLED };

  if (reducedMotion) {
    camera.position.x = 0;
    camera.position.y = 0;
    camera.lookAt(0, 0, 0);
    return out;
  }
  // The orbit clock slows with the field, so reading is never against a drifting camera.
  rig.orbit += dt * fieldMotion.timeScale;
  const t = rig.orbit;
  const calm = 1 - MOTION_READING_CUT * fieldMotion.reading;
  const dist = camera.position.z;
  const k = Math.min(1, dt * 3);
  rig.sx += (rig.px - rig.sx) * k;
  rig.sy += (rig.py - rig.sy) * k;
  const yaw = (Math.sin(t * ORBIT_SPEED) * ORBIT_YAW + rig.sx * 0.12) * calm;
  const pitch = (Math.sin(t * ORBIT_SPEED * 0.7 + 1.3) * ORBIT_PITCH + rig.sy * 0.06) * calm;
  camera.position.x = Math.sin(yaw) * dist + rig.sx * PARALLAX * 0.3 * calm;
  camera.position.y = Math.sin(pitch) * dist + rig.sy * PARALLAX * 0.3 * calm;
  camera.lookAt(0, 0, 0);
  return out;
}

/**
 * Imperative three.js loop, replacing react-three-fiber so the GL chunk carries only the renderer.
 * On-demand frames: the field asks for the next one while anything moves. Boot is split into short
 * tasks (context, buffers, async shader compile, first frame) so none blocks input.
 */
export function startEngine(container: HTMLElement, quality: FieldQuality, hooks: EngineHooks): Engine {
  const { reducedMotion, coarse, lean } = quality;
  let disposed = false;
  let hidden = document.hidden;
  let lost = false;
  let raf = 0;
  let resizeTimer = 0;
  let last = 0;
  let frames = 0;
  let fx: Fx | null = null;
  let field: Field | null = null;
  let renderer: WebGLRenderer | null = null;
  /** Frames only start once the program is compiled, so the first frame never stalls on linking. */
  let compiled = false;

  const camera = new PerspectiveCamera(38, 1, 0.1, 80);
  camera.position.set(0, 0, 7);
  const scene = new Scene();
  scene.background = new Color(CLEAR_COLOR);
  const rig: Rig = { orbit: 0, bloomW: 1, px: 0, py: 0, sx: 0, sy: 0 };
  const cleanups: Array<() => void> = [];

  const invalidate = () => {
    if (disposed || hidden || lost || raf || !compiled) return;
    raf = requestAnimationFrame(tick);
  };

  function tick() {
    raf = 0;
    if (disposed || hidden || lost || !renderer || !field) return;
    const now = performance.now();
    const delta = last ? (now - last) / 1000 : FALLBACK_FRAME_DT;
    last = now;
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    const more = field.step({ delta, now, width, height });
    const { bloom, easing } = stepRig(rig, camera, delta, reducedMotion);
    if (fx) fx.setBloom(bloom);
    else if (lean) field.setBloom(bloom);
    if (fx) fx.render(delta);
    else renderer.render(scene, camera);
    if (more || easing) invalidate();
    if (frames < FIRST_FRAMES && ++frames === FIRST_FRAMES) hooks.onReady();
  }

  function applySize() {
    if (!renderer || !field) return;
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), quality.maxDpr);
    renderer.setPixelRatio(dpr);
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    field.resize(w, h, dpr);
    fx?.setSize(w, h);
    invalidate();
  }

  async function boot() {
    try {
      const fxModule = lean ? null : import("./fx");
      renderer = new WebGLRenderer({ antialias: false, powerPreference: "high-performance", alpha: false, stencil: false, depth: false });
      // Parallel compile is polled below; skipping the blocking program-log read keeps linking off the main thread.
      renderer.debug.checkShaderErrors = process.env.NODE_ENV !== "production";
      const canvas = renderer.domElement;
      canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%";
      container.appendChild(canvas);
      // preventDefault asks the browser to restore the context; until it does the CSS glow shows through.
      const onLost = (e: Event) => {
        e.preventDefault();
        lost = true;
        hooks.onContextLost();
      };
      const onRestored = () => {
        lost = false;
        hooks.onContextRestored();
        last = 0;
        invalidate();
      };
      canvas.addEventListener("webglcontextlost", onLost);
      canvas.addEventListener("webglcontextrestored", onRestored);
      cleanups.push(() => {
        canvas.removeEventListener("webglcontextlost", onLost);
        canvas.removeEventListener("webglcontextrestored", onRestored);
      });
      // The first formations are built in the worker, in parallel with context creation; never wait on it for long.
      const first = formationsAhead(signalStore.getState().chapter).slice(0, 1);
      await Promise.race([requestFormations(quality.count, ["noise", ...first]), new Promise((resolve) => setTimeout(resolve, FORMATION_WAIT_MS))]);
      if (disposed) return;

      field = createField(camera, quality, invalidate);
      scene.add(field.points);
      const mod = fxModule ? await fxModule : null;
      if (disposed) return;
      if (mod) fx = mod.createFx(renderer, scene, camera, BLOOM_BASE);
      applySize();
      await yieldToMain();
      if (disposed) return;

      await renderer.compileAsync(scene, camera).catch(() => undefined);
      if (disposed) return;
      compiled = true;
      invalidate();
    } catch (error) {
      if (!disposed) hooks.onError(error);
    }
  }

  const onVisibility = () => {
    hidden = document.hidden;
    last = 0;
    invalidate();
  };
  document.addEventListener("visibilitychange", onVisibility);
  cleanups.push(() => document.removeEventListener("visibilitychange", onVisibility));

  const observer = new ResizeObserver(() => {
    if (!coarse) return applySize();
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(applySize, COARSE_RESIZE_DEBOUNCE_MS);
  });
  observer.observe(container);
  cleanups.push(() => {
    observer.disconnect();
    window.clearTimeout(resizeTimer);
  });

  if (!reducedMotion && !coarse) {
    const move = (e: PointerEvent) => {
      rig.px = (e.clientX / window.innerWidth) * 2 - 1;
      rig.py = -((e.clientY / window.innerHeight) * 2 - 1);
    };
    window.addEventListener("pointermove", move, { passive: true });
    cleanups.push(() => window.removeEventListener("pointermove", move));
  }

  void boot();

  return {
    dispose() {
      disposed = true;
      cancelAnimationFrame(raf);
      cleanups.forEach((c) => c());
      field?.dispose();
      fx?.dispose();
      if (renderer) {
        renderer.domElement.remove();
        renderer.dispose();
        renderer.forceContextLoss();
      }
    },
  };
}
