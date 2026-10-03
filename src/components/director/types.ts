import type { Caption } from "./narrator";

/** "done": the take has ended; the top bar stays up briefly with "Again". */
export type RunPhase = "idle" | "running" | "outro" | "done";
export type DirectorMode = "live" | "offline";

export type LogLine = { id: number; text: string };
export type Figure = { n: number; label: string };

export type DirectorState = {
  phase: RunPhase;
  mode: DirectorMode;
  take: number;
  prompt: string;
  /** The caption on screen: laid out whole, with the spoken word highlighted. */
  caption: Caption | null;
  /** Caption text for screen readers (aria-live). Empty while the voice is speaking it. */
  spoken: string;
  log: LogLine[];
  figure: Figure | null;
  /** performance.now() at the start of the take, for the timecode. */
  startedAt: number;
};

export const INITIAL_STATE: DirectorState = {
  phase: "idle",
  mode: "offline",
  take: 0,
  prompt: "",
  caption: null,
  spoken: "",
  log: [],
  figure: null,
  startedAt: 0,
};

/** Event fired on window when the Director spotlights a project in the Work chapter. */
export const SPOTLIGHT_EVENT = "director:spotlight";
export type SpotlightDetail = { slug: string };
