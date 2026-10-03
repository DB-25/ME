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
    component: "Chunked on ingest",
    line: "Source documents are split into chunks before anything else touches them.",
  },
  {
    id: "embeddings",
    label: "Embeddings",
    component: node("OpenSearch", "OpenSearch Serverless"),
    line: "Each chunk becomes a vector and is indexed, so meaning is searchable.",
  },
  {
    id: "retrieval",
    label: "Retrieval",
    component: node("Lambda", "Lambda"),
    line: "A Lambda finds the passages closest to the question.",
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
    line: `The answer reaches the person in the app. ${node("Cognito", "Cognito")} gates every call.`,
  },
];
