import type { ChapterId, FormationId } from "@/lib/director/protocol";

export type Chapter = { id: ChapterId; index: string; label: string; formation: FormationId };

/** Scroll order of the home page. Sections render `data-chapter={id}`. */
export const CHAPTERS: Chapter[] = [
  { id: "hero", index: "00", label: "Signal", formation: "portrait" },
  { id: "origin", index: "01", label: "Origin", formation: "globe" },
  { id: "systems", index: "02", label: "Systems", formation: "network" },
  { id: "work", index: "03", label: "Work", formation: "noise" },
  { id: "impact", index: "04", label: "Impact", formation: "crowd" },
  { id: "proof", index: "05", label: "Proof", formation: "constellation" },
  { id: "director", index: "06", label: "Director", formation: "noise" },
  { id: "human", index: "07", label: "Off duty", formation: "crosshair" },
  { id: "contact", index: "08", label: "Contact", formation: "singularity" },
];

export const chapterById = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;
