/**
 * The Director protocol: the contract between the site (client) and the
 * Director worker (worker/). The model does not just answer; it drives the
 * site through these actions while narrating.
 *
 * Wire format: the worker streams NDJSON (one DirectorEvent per line).
 */

export const CHAPTER_IDS = [
  "hero",
  "origin",
  "systems",
  "work",
  "impact",
  "proof",
  "director",
  "human",
  "contact",
] as const;
export type ChapterId = (typeof CHAPTER_IDS)[number];

/** Built-in particle formations the field knows how to make. */
export const FORMATIONS = [
  "noise",
  "signal",
  "globe",
  "network",
  "crowd",
  "constellation",
  "crosshair",
  "singularity",
] as const;
export type FormationId = (typeof FORMATIONS)[number];

export type DirectorAction =
  /** Smooth-scroll the page to a chapter. */
  | { name: "goto_chapter"; args: { chapter: ChapterId } }
  /** Spotlight one project (scrolls to work and focuses it). */
  | { name: "show_project"; args: { slug: string } }
  /** Open a case study page. */
  | { name: "open_case_study"; args: { slug: string } }
  /**
   * Morph the particle field into a model-drawn shape. `svg` is a complete
   * <svg viewBox="0 0 512 512">…</svg> using only path/circle/rect/ellipse/
   * line/polyline/polygon with strokes or fills (no text, no images, no
   * scripts). The client sanitizes and samples it into particle targets.
   */
  | { name: "draw"; args: { svg: string; label: string } }
  /** Morph the field into a built-in formation. */
  | { name: "form"; args: { formation: FormationId } }
  /** Tint the field (hex). Reset with null. */
  | { name: "set_hue"; args: { hex: string | null } }
  /** Hand control back to the visitor. */
  | { name: "end_scene"; args: Record<string, never> };

export type DirectorEvent =
  | { type: "text"; delta: string }
  | { type: "action"; action: DirectorAction }
  | { type: "done" }
  | { type: "error"; message: string };

export type DirectorMessage = { role: "user" | "assistant"; content: string };

export type DirectorRequest = { messages: DirectorMessage[] };
