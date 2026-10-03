import type { CaptionWord } from "./narrator";

export type RunPhase = "idle" | "running" | "outro";
export type DirectorMode = "live" | "offline";

export type LogLine = { id: number; text: string };
export type Figure = { n: number; label: string };

export type DirectorState = {
  phase: RunPhase;
  mode: DirectorMode;
  take: number;
  prompt: string;
  /** Words of the caption currently on screen. */
  words: CaptionWord[];
  /** Completed caption text for screen readers (aria-live). */
  spoken: string;
  log: LogLine[];
  figure: Figure | null;
  /** performance.now() at the start of the take, for the timecode. */
  startedAt: number;
  /** A take has finished and the visitor has not started another. */
  afterglow: boolean;
};

export const INITIAL_STATE: DirectorState = {
  phase: "idle",
  mode: "offline",
  take: 0,
  prompt: "",
  words: [],
  spoken: "",
  log: [],
  figure: null,
  startedAt: 0,
  afterglow: false,
};

/** Event fired on window when the Director spotlights a project in the Work chapter. */
export const SPOTLIGHT_EVENT = "director:spotlight";
export type SpotlightDetail = { slug: string };
