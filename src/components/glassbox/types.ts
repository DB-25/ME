import type { MutableRefObject } from "react";

/** Pipeline phases of a DB-1 glass-box run. */
export type GlassPhase =
  | "idle"
  | "tokenize"
  | "retrieve"
  | "generate"
  | "compose"
  | "eval"
  | "done";

export const PHASE_ORDER: GlassPhase[] = [
  "idle",
  "tokenize",
  "retrieve",
  "generate",
  "compose",
  "eval",
  "done",
];

/** Contract between the GlassBox shell (owner) and the 3D NeuralField. */
export interface NeuralFieldProps {
  /** Owner increments this per streamed chunk; NeuralField diffs it in useFrame
   *  into terracotta pulse waves. Mutation only — never React state. */
  pulseRef: MutableRefObject<number>;
  /** Owner increments this per retrieval doc hit → teal pulse from the vault cluster. */
  retrievalRef: MutableRefObject<number>;
  phase: GlassPhase;
  reduced: boolean;
}

/** A retrieved "memory vault" document shown in the left rail. */
export interface VaultDoc {
  /** Obsidian-style path, e.g. "projects/genie.md" */
  file: string;
  /** The highlighted excerpt line. */
  line: string;
}

/** Real groundedness scores from /api/verify (omitted from UI when absent). */
export interface VerifyScores {
  faithfulness: number;
  relevancy: number;
}
