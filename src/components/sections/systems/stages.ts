import { projects } from "@/content";

/** The architecture the strip is grounded in. Every component name below is read from it. */
const BASE = projects.find((p) => p.slug === "knowledge-agent-for-impact");
const NODES = BASE?.architecture?.nodes ?? [];
const node = (prefix: string, fallback: string) => NODES.find((n) => n.startsWith(prefix)) ?? fallback;

export const PIPELINE_SOURCE = {
  name: BASE?.name ?? "knowledge-agent-for-impact",
  tagline: BASE?.tagline ?? "",
  flow: BASE?.architecture?.flow ?? "",
};

export type Stage = { id: string; label: string; component: string; line: string };

export const STAGES: Stage[] = [
  {
    id: "documents",
    label: "Documents",
    component: "S3",
    line: "Source documents land in S3 and sync into the index on their own.",
  },
  {
    id: "index",
    label: "Index",
    component: node("Amazon Kendra", "Amazon Kendra"),
    line: "Every document is indexed by meaning, not just keywords.",
  },
  {
    id: "retrieval",
    label: "Retrieval",
    component: node("Chat Lambda", "Lambda"),
    line: "A chat Lambda pulls the passages closest to the question.",
  },
  {
    id: "model",
    label: "Model",
    component: node("Bedrock", "Bedrock"),
    line: "The model answers from those passages, not from memory.",
  },
  {
    id: "answer",
    label: "Answer",
    component: node("React", "React app"),
    line: `The answer streams to the app over a WebSocket. ${node("Cognito", "Cognito")} gates every call.`,
  },
];
