import { projects, REPO } from "@/content";

/**
 * The pipeline the strip is drawn from: A-IEP's, because it is the flagship and the privacy story is the point.
 * Component names are read from the project's own architecture, so a rename there reaches this strip.
 */
const BASE = projects.find((p) => p.slug === "a-iep");
const NODES = BASE?.architecture?.nodes ?? [];
const node = (prefix: string, fallback: string) => NODES.find((n) => n.startsWith(prefix)) ?? fallback;

export const PIPELINE_SOURCE = {
  name: BASE?.name ?? "A-IEP",
  tagline: "The path every IEP takes: names redacted before a writing model reads a word, the original deleted, and a purge on any failure.",
  /** The state machine definition in the public repo, so the strip can be checked against the real thing. */
  href: REPO.aiepStateMachine,
  hrefLabel: "State machine",
};

export type Stage = { id: string; label: string; component: string; line: string };

export const STAGES: Stage[] = [
  {
    id: "upload",
    label: "Upload",
    component: `${node("S3", "S3")}, Step Functions`,
    line: "A parent’s IEP lands in an encrypted bucket and a Step Functions run starts.",
  },
  {
    id: "ocr",
    label: "OCR",
    component: node("Mistral OCR", "Mistral OCR"),
    line: "The one step that sees the original page, names included. Mistral’s copy is deleted once it answers.",
  },
  {
    id: "redact",
    label: "Redact",
    component: node("Comprehend", "Comprehend"),
    line: "Every identifier except dates is replaced, and an error stops the run. Then the original upload is deleted.",
  },
  {
    id: "summarize",
    label: "Summarize",
    component: "OpenAI GPT-4.1",
    line: "Reads redacted text only and writes the summary in nine sections, each pointing back to its pages.",
  },
  {
    id: "translate",
    label: "Translate",
    component: "OpenAI GPT-4.1",
    line: "Spanish, Vietnamese and Chinese, from the English summary. Any failure purges unredacted artifacts.",
  },
];
