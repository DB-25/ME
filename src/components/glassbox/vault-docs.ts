/**
 * Memory-vault documents + canned scratchpad notes for the DB-1 glass box.
 *
 * Every line is computed from the real data modules (@/data/projects,
 * @/data/profile, @/data/impact) so the "retrieved sources" shown in the
 * overlay are honest excerpts, not lorem.
 */

import { projects } from "@/data/projects";
import { profile } from "@/data/profile";
import { impactMetrics, awards } from "@/data/impact";
import type { SceneId } from "@/components/command/bento-scenes";
import type { VaultDoc } from "./types";

// ---------------------------------------------------------------------------
// Lookup helpers
// ---------------------------------------------------------------------------

const proj = (sceneId: string) => projects.find((p) => p.sceneId === sceneId);
const metric = (id: string) => impactMetrics.find((m) => m.id === id);
const award = (id: string) => awards.find((a) => a.id === id);

/** First sentence of a prose field. */
function firstSentence(text: string): string {
  const trimmed = text.trim();
  const stop = trimmed.search(/[.?!]\s/);
  return stop === -1 ? trimmed : trimmed.slice(0, stop + 1);
}

/** The sentence of `text` containing `keyword` (case-insensitive). */
function sentenceWith(text: string, keyword: string): string {
  const sentences = text.match(/[^.?!]+[.?!]?/g) ?? [text];
  const found = sentences.find((s) =>
    s.toLowerCase().includes(keyword.toLowerCase())
  );
  return (found ?? sentences[0] ?? text).trim();
}

/** Clip an excerpt like an Obsidian search result. */
function clip(text: string, max = 120): string {
  const t = text.trim();
  return t.length <= max ? t : `${t.slice(0, max - 1).trimEnd()}…`;
}

/** "44K+ state employees · 40% cost reduction" style composite. */
function metricsLine(sceneId: string, count = 3): string {
  const p = proj(sceneId);
  if (!p) return "";
  return p.metrics
    .slice(0, count)
    .map((m) => `${m.value} ${m.label.toLowerCase()}`)
    .join(" · ");
}

/** "GENIE — AI Sandbox for 44K+ State Employees" lead line. */
function leadLine(sceneId: string): string {
  const p = proj(sceneId);
  return p ? `${p.name} — ${p.subtitle}` : "";
}

// ---------------------------------------------------------------------------
// Vault docs per scene
// ---------------------------------------------------------------------------

const users = metric("users");
const benefits = metric("benefits");
const tools = metric("tools");
const agencies = metric("agencies");
const naspo = award("naspo-gold");

const genie = proj("genie");
const aiep = proj("aiep");
const vct = proj("vct");
const onel = proj("one-l");
const smart = proj("smart-model");
const flutter = proj("flutter");
const edu = profile.education[0];

const reachLine = users
  ? `${users.value} ${users.label.toLowerCase()} — ${users.description.toLowerCase()}`
  : "500K+ users served — across 20+ government agencies";

const naspoLine = naspo
  ? clip(`${naspo.title} · ${naspo.year} — ${naspo.issuer}`)
  : "NASPO Cronin Gold Award · 2025";

const routingLine = smart
  ? `${smart.name} — ${metricsLine("smart-model", 2)}`
  : "Smart Model Selector — 14 models · 40% cost cut";

const VAULT: Record<SceneId, VaultDoc[]> = {
  default: [
    { file: "profile/positioning.md", line: profile.positioningLine },
    { file: "impact/reach.md", line: reachLine },
    { file: "projects/genie.md", line: leadLine("genie") },
  ],
  genie: [
    { file: "projects/genie.md", line: leadLine("genie") },
    { file: "infra/routing.md", line: routingLine },
    {
      file: "story/governor.md",
      line: genie
        ? clip(sentenceWith(genie.description, "Governor"))
        : "Presented to Governor Maura Healey.",
    },
  ],
  aiep: [
    { file: "projects/a-iep.md", line: leadLine("aiep") },
    {
      file: "infra/privacy.md",
      line: aiep?.tradeoff
        ? clip(aiep.tradeoff)
        : "PII redaction via Comprehend before any AI analysis.",
    },
    {
      file: "story/community.md",
      line: aiep
        ? clip(sentenceWith(aiep.description, "parents"))
        : "Co-designed with the parents who use it.",
    },
  ],
  vct: [
    { file: "projects/vct-scout.md", line: leadLine("vct") },
    {
      file: "infra/agents.md",
      line: vct
        ? clip(sentenceWith(vct.description, "Bedrock"))
        : "Bedrock Agents over 1TB+ of Valorant game logs.",
    },
    { file: "awards/reinvent.md", line: metricsLine("vct", 2) },
  ],
  "one-l": [
    { file: "projects/one-l.md", line: leadLine("one-l") },
    {
      file: "infra/eval.md",
      line: onel?.approach
        ? clip(sentenceWith(onel.approach, "RAGAS"))
        : "RAGAS evaluation loop — quality measured, not assumed.",
    },
    { file: "awards/naspo.md", line: naspoLine },
  ],
  "knowledge-agent": [
    { file: "projects/knowledge-agent.md", line: leadLine("knowledge-agent") },
    { file: "infra/rag-platform.md", line: metricsLine("knowledge-agent") },
    { file: "impact/reach.md", line: reachLine },
  ],
  "smart-model": [
    { file: "projects/smart-model.md", line: leadLine("smart-model") },
    {
      file: "infra/routing.md",
      line: smart
        ? clip(firstSentence(smart.description), 140)
        : routingLine,
    },
  ],
  rag: [
    { file: "projects/rag-pipeline.md", line: leadLine("rag") },
    { file: "infra/retrieval.md", line: metricsLine("rag", 2) },
  ],
  flutter: [
    { file: "projects/acharya-erp.md", line: leadLine("flutter") },
    {
      file: "story/bangalore.md",
      line: flutter
        ? clip(sentenceWith(flutter.description, "first thing"))
        : "The first thing I shipped that thousands relied on daily.",
    },
    { file: "impact/ratings.md", line: metricsLine("flutter", 2) },
  ],
  impact: [
    {
      file: "impact/metrics.md",
      line: `${users?.value ?? "500K+"} users · ${tools?.value ?? "26"} AI tools · ${agencies?.value ?? "20+"} agencies`,
    },
    {
      file: "impact/benefits.md",
      line: benefits
        ? `${benefits.value} ${benefits.label.toLowerCase()} — ${benefits.description.toLowerCase()}`
        : "$5.4M+ federal benefits unlocked",
    },
    { file: "awards/naspo.md", line: naspoLine },
  ],
  stack: [
    { file: "stack/core.md", line: topTechLine() },
    { file: "profile/experience.md", line: clip(firstSentence(profile.summary), 140) },
    { file: "infra/routing.md", line: routingLine },
  ],
  story: [
    { file: "story/arc.md", line: profile.positioningLine },
    {
      file: "story/bangalore.md",
      line: flutter
        ? `${flutter.name} — ${metricsLine("flutter", 1)}`
        : "Acharya ERP — 100 → 20K+ daily users",
    },
    {
      file: "story/boston.md",
      line: `${edu.degree} · ${edu.school} · GPA ${edu.gpa}`,
    },
  ],
};

/** Most-used technologies across all project stacks. */
function topTechLine(): string {
  const counts = new Map<string, number>();
  for (const p of projects) {
    for (const t of p.techStack) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([t]) => t)
    .join(" · ");
}

export function getVaultDocs(scene: SceneId): VaultDoc[] {
  return VAULT[scene] ?? VAULT.default;
}

// ---------------------------------------------------------------------------
// Canned scratchpad notes (offline / demo mode) — terse, first-person,
// lowercase, arrow-driven. Streamed char-by-char by useGlassBoxRun.
// ---------------------------------------------------------------------------

const CANNED_NOTES: Record<SceneId, string[]> = {
  default: [
    "parse: open-ended intro → route to overview",
    "pull profile/positioning.md → 5+ yrs, 500k reach",
    "→ lead with scale, keep the tone warm",
    "compose: overview tiles + one-line answer",
  ],
  genie: [
    "intent → project deep-dive: genie",
    "pull projects/genie.md → 44k employees, 14 models",
    "→ routing story matters: 40% cost cut via selector",
    "→ don't bury the governor demo",
    "compose: adoption first, then cost + routing",
  ],
  aiep: [
    "intent → project: a-iep, accessibility angle",
    "pull projects/a-iep.md → 1,000+ families, 4 languages",
    "→ privacy is the spine: pii redaction before analysis",
    "→ co-design with parents is the differentiator",
    "compose: lead with families, close with trust",
  ],
  vct: [
    "intent → hackathon story: vct scout",
    "pull projects/vct-scout.md → 2nd of 3,300+ teams",
    "→ 1tb of game logs, bedrock agents over athena",
    "compose: placement first, then the data story",
  ],
  "one-l": [
    "intent → procurement: one-l + abe",
    "pull projects/one-l.md → 83% legal review cut",
    "→ 11-stage pipeline, ragas eval keeps it honest",
    "→ naspo gold is the proof point",
    "compose: outcome, pipeline, award",
  ],
  "knowledge-agent": [
    "intent → platform question: shared rag infra",
    "pull projects/knowledge-agent.md → 10+ deployments",
    "→ this is the layer every other tool builds on",
    "compose: platform framing, then reach numbers",
  ],
  "smart-model": [
    "intent → routing: smart model selector",
    "pull projects/smart-model.md → 14 models routed",
    "→ task + cost + tokens decide the model, not vibes",
    "compose: 40% cost cut is the headline",
  ],
  rag: [
    "intent → rag fundamentals",
    "pull projects/rag-pipeline.md → +20% retrieval accuracy",
    "→ hallucinations down 40% with eval in ci/cd",
    "compose: accuracy first, then the pipeline",
  ],
  flutter: [
    "intent → origin story: acharya erp",
    "pull projects/acharya-erp.md → 100 → 20k+ daily users",
    "→ ratings 1.2 → 4.5, owned design through deploy",
    "compose: first thing i shipped that people relied on",
  ],
  impact: [
    "intent → numbers question",
    "pull impact/metrics.md → 500k+ users, 26 tools",
    "→ $5.4m benefits unlocked, 83% faster legal review",
    "→ naspo gold anchors the credibility",
    "compose: dense metric tiles, short answer line",
  ],
  stack: [
    "intent → tooling question",
    "pull stack/core.md → python + typescript on aws",
    "→ bedrock, claude, rag, step functions, cdk",
    "compose: core stack line + depth notes",
  ],
  story: [
    "intent → personal arc",
    "pull story/arc.md → bangalore → boston",
    "→ flutter app to 20k users, then m.s. in ai",
    "→ now: ai for half a million people",
    "compose: chronological, end in the present",
  ],
};

export function getCannedNotes(scene: SceneId): string {
  return (CANNED_NOTES[scene] ?? CANNED_NOTES.default).join("\n");
}
