import type { ChapterId, FormationId } from "@/lib/director/protocol";

export type Chapter = { id: ChapterId; index: string; label: string; formation: FormationId };

/**
 * Scroll order of the home page: the work first (it was the 3rd screen's worth of scrolling away behind the
 * impact numbers: 2,600px to the first project on a laptop, 3,350px on a phone), then the numbers behind it,
 * proof, how I build, the Director, who I am, contact. Sections render `data-chapter={id}`.
 * `index` is the position in this list: keep it in step when the order changes.
 */
export const CHAPTERS: Chapter[] = [
  { id: "hero", index: "00", label: "Signal", formation: "signal" },
  { id: "work", index: "01", label: "Work", formation: "noise" },
  { id: "impact", index: "02", label: "Impact", formation: "crowd" },
  { id: "proof", index: "03", label: "Proof", formation: "constellation" },
  { id: "systems", index: "04", label: "How I build", formation: "network" },
  { id: "director", index: "05", label: "Director", formation: "noise" },
  { id: "origin", index: "06", label: "About", formation: "globe" },
  { id: "human", index: "07", label: "Off duty", formation: "crosshair" },
  { id: "contact", index: "08", label: "Contact", formation: "singularity" },
];

export const chapterById = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;
