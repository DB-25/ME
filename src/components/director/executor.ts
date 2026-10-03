import type { DirectorAction } from "@/lib/director/protocol";
import { signalStore } from "@/lib/signal-store";
import { prefersReducedMotion, scrollToTarget } from "@/lib/motion";
import { projects } from "@/content";
import { SPOTLIGHT_EVENT, type SpotlightDetail } from "./types";

/** How long each action needs to finish visually before the next one starts. */
const SCROLL_MS = 1700;
const SPOTLIGHT_MS = 1100;
const DRAW_MS = 1900;
const FORM_MS = 1500;
const HUE_MS = 450;
const REDUCED_MS = 350;

const POINT_COUNT = 24_000;

export type ExecContext = {
  signal: AbortSignal;
  log: (text: string) => void;
  showFigure: (label: string) => void;
  /** Case study to open once the queue is empty (it navigates away). */
  deferNavigation: (slug: string) => void;
};

export function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(done, ms);
    function done() {
      clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    }
    signal.addEventListener("abort", done, { once: true });
  });
}

const projectName = (slug: string) => projects.find((p) => p.slug === slug)?.name ?? slug;

/** Wait for a visual beat, collapsed to a short pause under reduced motion. */
const beat = (ms: number, signal: AbortSignal) => sleep(prefersReducedMotion() ? REDUCED_MS : ms, signal);

function goto(target: string) {
  scrollToTarget(target);
}

function spotlight(slug: string) {
  window.dispatchEvent(new CustomEvent<SpotlightDetail>(SPOTLIGHT_EVENT, { detail: { slug } }));
}

async function draw(svg: string, label: string, ctx: ExecContext) {
  ctx.log(`draw: ${label}`);
  try {
    const { sampleSvg } = await import("@/components/signal/fromSvg");
    const points = await sampleSvg(svg, POINT_COUNT);
    if (ctx.signal.aborted) return;
    if (!points) {
      ctx.log("draw skipped: shape could not be sampled");
      return;
    }
    signalStore.getState().set({ override: { kind: "points", points, label } });
    ctx.showFigure(label);
    await beat(DRAW_MS, ctx.signal);
  } catch {
    ctx.log("draw skipped: sampler unavailable");
  }
}

/** Run one action and resolve when it has visually finished. */
export async function runAction(action: DirectorAction, ctx: ExecContext): Promise<void> {
  const store = signalStore.getState();
  switch (action.name) {
    case "goto_chapter":
      ctx.log(`goto ${action.args.chapter}`);
      goto(`#${action.args.chapter}`);
      return beat(SCROLL_MS, ctx.signal);
    case "show_project":
      ctx.log(`spotlight ${projectName(action.args.slug)}`);
      goto("#work");
      await beat(SCROLL_MS, ctx.signal);
      if (!ctx.signal.aborted) spotlight(action.args.slug);
      return beat(SPOTLIGHT_MS, ctx.signal);
    case "open_case_study":
      ctx.log(`open ${projectName(action.args.slug)} (last)`);
      ctx.deferNavigation(action.args.slug);
      return;
    case "draw":
      return draw(action.args.svg, action.args.label, ctx);
    case "form":
      ctx.log(`form ${action.args.formation}`);
      store.set({ override: { kind: "formation", id: action.args.formation } });
      return beat(FORM_MS, ctx.signal);
    case "set_hue":
      ctx.log(action.args.hex ? `tint ${action.args.hex}` : "tint reset");
      store.set({ hue: action.args.hex });
      return beat(HUE_MS, ctx.signal);
    case "speak":
      return; // played by the run loop, which owns the Narrator
    case "end_scene":
      return;
  }
}

/** Hand the particle field and the Work chapter back to the visitor. */
export function releaseStage() {
  signalStore.getState().set({ override: null, hue: null, energy: 0 });
  window.dispatchEvent(new CustomEvent("director:release"));
}
