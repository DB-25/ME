import type { ChapterId, FormationId } from "@/lib/director/protocol";

export type Chapter = { id: ChapterId; index: string; label: string; formation: FormationId };

/** Scroll order of the home page: work, proof, how I build, who I am, contact. Sections render `data-chapter={id}`. */
export const CHAPTERS: Chapter[] = [
  { id: "hero", index: "00", label: "Signal", formation: "signal" },
  { id: "impact", index: "01", label: "Impact", formation: "crowd" },
  { id: "work", index: "02", label: "Work", formation: "noise" },
  { id: "proof", index: "03", label: "Proof", formation: "constellation" },
  { id: "systems", index: "04", label: "How I build", formation: "network" },
  { id: "director", index: "05", label: "Director", formation: "noise" },
  { id: "origin", index: "06", label: "About", formation: "globe" },
  { id: "human", index: "07", label: "Off duty", formation: "crosshair" },
  { id: "contact", index: "08", label: "Contact", formation: "singularity" },
];

export const chapterById = (id: ChapterId) => CHAPTERS.find((c) => c.id === id)!;
