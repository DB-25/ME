import type { DirectorAction } from "@/lib/director/protocol";
import { signalStore, type SignalOverride } from "@/lib/signal-store";
import { prefersReducedMotion } from "@/lib/motion";
import { projects } from "@/content";
import { SPOTLIGHT_EVENT, type SpotlightDetail } from "./types";

/** How long each action needs to finish visually before the next one starts. */
const SPOTLIGHT_MS = 1100;
/** Long enough for the particles to gather into the sketch; the line that follows is spoken over it. */
const DRAW_MS = 1300;
const FORM_MS = 1500;
const HUE_MS = 450;
const REDUCED_MS = 350;

const POINT_COUNT = 24_000;

export type ExecContext = {
  signal: AbortSignal;
  log: (text: string) => void;
  showFigure: (label: string) => void;
  /** The sketch is gone: take its figure label off the HUD. */
  clearFigure: () => void;
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

/* ---------- moving the page ---------- */

/** Where on screen content should land: below the top bar, and in the upper part of the stage, clear of the caption lane. */
const STAGE_FOCUS = 0.4;
const TOP_BAR_MIN = 48;
const TOP_BAR_MAX = 72;
const TOP_BAR_VH = 0.07;
const BREATHING_ROOM = 24;
/** Farther than this many screens, scrolling would whip through every chapter in between: cut instead. */
const CUT_SCREENS = 2.2;
const SMOOTH_MIN_S = 0.9;
const SMOOTH_MAX_S = 1.8;
const SMOOTH_S_PER_SCREEN = 0.35;
const FADE_OUT_MS = 240;
const FADE_IN_MS = 420;
const LANE_CLASS = "dir-lane";
const CUT_CLASS = "dir-cut";
const SETTLE_MS = 700;

type LenisLike = {
  scrollTo: (target: number, options?: { duration?: number; immediate?: boolean; force?: boolean }) => void;
  limit: number;
};
const lenis = () => (window as unknown as { lenis?: LenisLike }).lenis;

const topLead = () =>
  Math.min(TOP_BAR_MAX, Math.max(TOP_BAR_MIN, window.innerHeight * TOP_BAR_VH)) + BREATHING_ROOM;

/** The scroll position that puts `el` where the stage wants it. */
function stageY(el: HTMLElement, where: "top" | "center"): number {
  const rect = el.getBoundingClientRect();
  const y = window.scrollY + rect.top;
  return Math.max(0, where === "center" ? y + rect.height / 2 - window.innerHeight * STAGE_FOCUS : y - topLead());
}

const jump = (y: number) => {
  const l = lenis();
  if (l) l.scrollTo(y, { immediate: true, force: true });
  window.scrollTo({ top: y, behavior: "auto" });
};

/**
 * Bring the page to `y`. Near targets glide. Far ones are cut: the content fades,
 * the page jumps while it is invisible, and it fades back, so the visitor never
 * watches (or loses) the field of sections in between. The particle field is
 * never faded, so the screen is never empty.
 */
async function travel(y: number, signal: AbortSignal): Promise<void> {
  const distance = Math.abs(y - window.scrollY);
  if (distance < 2) return;
  const reduced = prefersReducedMotion();
  const root = document.documentElement;
  if (reduced || distance > window.innerHeight * CUT_SCREENS) {
    if (!reduced) {
      root.classList.add(CUT_CLASS);
      await sleep(FADE_OUT_MS, signal);
    }
    if (!signal.aborted) jump(y);
    root.classList.remove(CUT_CLASS);
    return reduced ? undefined : sleep(FADE_IN_MS, signal);
  }
  const seconds = Math.min(SMOOTH_MAX_S, Math.max(SMOOTH_MIN_S, (distance / window.innerHeight) * SMOOTH_S_PER_SCREEN));
  const l = lenis();
  if (l) l.scrollTo(y, { duration: seconds });
  else window.scrollTo({ top: y, behavior: "smooth" });
  return sleep(seconds * 1000 + 150, signal);
}

/** Chapters whose content sits low in the section are focused on that content, not the section top. Contact lands on its headline, so the ask and the email are both on stage. */
const CHAPTER_FOCUS: Partial<Record<string, string>> = { contact: "#contact-title" };

async function gotoChapter(chapter: string, signal: AbortSignal) {
  const focus = CHAPTER_FOCUS[chapter] && document.querySelector<HTMLElement>(CHAPTER_FOCUS[chapter]!);
  const section = document.getElementById(chapter);
  if (focus) return travel(stageY(focus, "top"), signal);
  if (section) return travel(stageY(section, "top"), signal);
}

/** Bring a section to the top of the stage (used when the visitor asks for another take). */
export function goToSection(id: string): Promise<void> {
  return gotoChapter(id, new AbortController().signal);
}

/**
 * The caption lane sits above the HUD footer. While a take runs the page is given
 * room below its last section, so even the final chapter can be scrolled up out of
 * the lane; on release the page settles back before that room is taken away.
 */
export function reserveLane(on: boolean) {
  const root = document.documentElement;
  if (on) return void root.classList.add(LANE_CLASS);
  if (!root.classList.contains(LANE_CLASS)) return;
  const pad = parseFloat(getComputedStyle(root).getPropertyValue("--dir-lane-vh")) || 0;
  const max = root.scrollHeight - window.innerHeight - (pad ? (pad / 100) * window.innerHeight : 0);
  if (window.scrollY > max && !prefersReducedMotion()) {
    const l = lenis();
    if (l) l.scrollTo(Math.max(0, max), { duration: SETTLE_MS / 1000 });
    window.setTimeout(() => root.classList.remove(LANE_CLASS), SETTLE_MS + 100);
  } else {
    if (window.scrollY > max) jump(Math.max(0, max));
    root.classList.remove(LANE_CLASS);
  }
}

function spotlight(slug: string) {
  window.dispatchEvent(new CustomEvent<SpotlightDetail>(SPOTLIGHT_EVENT, { detail: { slug } }));
}

/*
 * A sketch is held while the line after it is spoken, and dissolves when the page moves on. While it is
 * up the page content steps back (html.dir-sketch, see director.css), so no drawing is ever struck
 * through a heading or a paragraph. Only one sketch lives at a time.
 */
const SKETCH_CLASS = "dir-sketch";
let sketch: { before: SignalOverride | null; mine: SignalOverride; clearFigure: () => void } | null = null;

/** Dissolve the held sketch: the content returns and the field goes back to what it was doing. */
function endSketch() {
  document.documentElement.classList.remove(SKETCH_CLASS);
  if (!sketch) return;
  const { before, mine, clearFigure } = sketch;
  sketch = null;
  clearFigure();
  const store = signalStore.getState();
  // Only undo our own override: a later `form` has already replaced it.
  if (store.override === mine) store.set({ override: before && before.kind === "formation" ? before : null });
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
    endSketch();
    const store = signalStore.getState();
    const mine: SignalOverride = { kind: "points", points, label };
    sketch = { before: store.override, mine, clearFigure: ctx.clearFigure };
    document.documentElement.classList.add(SKETCH_CLASS);
    store.set({ override: mine });
    ctx.showFigure(label);
    await beat(DRAW_MS, ctx.signal);
  } catch {
    ctx.log("draw skipped: sampler unavailable");
  }
}

/** Run one action and resolve when it has visually finished. */
export async function runAction(action: DirectorAction, ctx: ExecContext): Promise<void> {
  const store = signalStore.getState();
  if (action.name !== "speak" && action.name !== "end_scene" && action.name !== "draw" && action.name !== "set_hue") endSketch();
  switch (action.name) {
    case "goto_chapter":
      ctx.log(`goto ${action.args.chapter}`);
      return gotoChapter(action.args.chapter, ctx.signal);
    case "show_project": {
      ctx.log(`spotlight ${projectName(action.args.slug)}`);
      const row = document.querySelector<HTMLElement>(`[data-slug="${action.args.slug}"]`);
      const work = document.getElementById("work");
      const target = row ?? work;
      if (target) await travel(stageY(target, "top"), ctx.signal);
      if (!ctx.signal.aborted) spotlight(action.args.slug);
      return beat(SPOTLIGHT_MS, ctx.signal);
    }
    case "open_case_study": {
      // Compact lab projects have no page; never navigate to a 404.
      const target = projects.find((p) => p.slug === action.args.slug);
      if (!target || target.compact) return;
      ctx.log(`open ${projectName(action.args.slug)} (last)`);
      ctx.deferNavigation(action.args.slug);
      return;
    }
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
  endSketch();
  signalStore.getState().set({ override: null, hue: null, energy: 0 });
  window.dispatchEvent(new CustomEvent("director:release"));
}
