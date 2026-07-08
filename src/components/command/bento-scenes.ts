import { profile } from "@/data/profile";
import { projects, aiForImpact } from "@/data/projects";
import { skills, skillCategories } from "@/data/skills";
import { timeline } from "@/data/timeline";
import { impactMetrics, awards } from "@/data/impact";

// ---------------------------------------------------------------------------
// Tile descriptor types — the "objects" that populate the bento grid.
// ---------------------------------------------------------------------------

export type TileAccent = "terracotta" | "purple" | "teal" | "blue" | "none";

interface BaseTile {
  /** Stable id within a scene — used as the animation key. */
  id: string;
  accent?: TileAccent;
}

export interface MetricTile extends BaseTile {
  type: "metric";
  label: string;
  value: string;
  note?: string;
}

export interface ProjectTile extends BaseTile {
  type: "project";
  name: string;
  desc: string;
  sceneId?: string;
}

export interface ArchTile extends BaseTile {
  type: "arch";
  label: string;
  /** Ordered node chain rendered as `a → b → c`. */
  nodes: string[];
}

export interface CodeTile extends BaseTile {
  type: "code";
  label: string;
  /** 2-3 short lines of mono code, lightly syntax-tinted. */
  lines: string[];
}

export interface TextTile extends BaseTile {
  type: "text";
  label: string;
  body: string;
}

export interface AwardTile extends BaseTile {
  type: "award";
  title: string;
  issuer: string;
  year: string;
}

export type BentoTileData =
  | MetricTile
  | ProjectTile
  | ArchTile
  | CodeTile
  | TextTile
  | AwardTile;

export type SceneId =
  | "default"
  | "genie"
  | "aiep"
  | "vct"
  | "one-l"
  | "knowledge-agent"
  | "smart-model"
  | "rag"
  | "flutter"
  | "impact"
  | "stack"
  | "story";

// ---------------------------------------------------------------------------
// Data lookup helpers
// ---------------------------------------------------------------------------

/** sceneId on a project record → our scene key (they mostly line up, `one-l` differs). */
function projectBySceneId(sceneId: string) {
  return projects.find((p) => p.sceneId === sceneId);
}

const award = (id: string) => awards.find((a) => a.id === id);
const metric = (id: string) => impactMetrics.find((m) => m.id === id);

const accentForColor = (hex?: string): TileAccent => {
  switch (hex) {
    case "#A78BFA":
      return "purple";
    case "#5DCAA5":
      return "teal";
    case "#85B7EB":
      return "blue";
    case "#E8845C":
    case "#F0997B":
      return "terracotta";
    default:
      return "none";
  }
};

const firstLine = (text: string): string => {
  const trimmed = text.trim();
  const stop = trimmed.search(/[.?!]\s/);
  return stop === -1 ? trimmed : trimmed.slice(0, stop + 1);
};

// ---------------------------------------------------------------------------
// Per-project scene builder — turns a Project record into ~6 tiles.
// ---------------------------------------------------------------------------

function projectScene(sceneId: string): BentoTileData[] {
  const p = projectBySceneId(sceneId);
  if (!p) return defaultScene;

  const accent = accentForColor(p.accentColor);
  const tiles: BentoTileData[] = [];

  // Lead project tile
  tiles.push({
    id: `${p.id}-lead`,
    type: "project",
    name: p.name,
    desc: p.subtitle,
    sceneId: p.sceneId,
    accent,
  });

  // Up to three metrics
  p.metrics.slice(0, 3).forEach((m, i) => {
    tiles.push({
      id: `${p.id}-m${i}`,
      type: "metric",
      label: m.label,
      value: m.value,
      accent: i === 0 ? accent : "none",
    });
  });

  // Architecture chain (if present)
  if (p.architecture && p.architecture.nodes.length > 0) {
    tiles.push({
      id: `${p.id}-arch`,
      type: "arch",
      label: "architecture",
      nodes: p.architecture.nodes.map((n) => n.label),
      accent: "none",
    });
  }

  // Award or a tradeoff/approach fact
  if (p.award) {
    tiles.push({
      id: `${p.id}-award`,
      type: "award",
      title: p.award.split("+")[0].trim(),
      issuer: "Recognition",
      year: p.year ?? "",
      accent,
    });
  } else if (p.tradeoff) {
    tiles.push({
      id: `${p.id}-tradeoff`,
      type: "text",
      label: "tradeoff",
      body: firstLine(p.tradeoff),
      accent: "none",
    });
  }

  // Tech stack as a code-ish line
  tiles.push({
    id: `${p.id}-stack`,
    type: "code",
    label: "stack",
    lines: [
      `// ${p.name.toLowerCase().replace(/\s+/g, "-")}`,
      `const stack = [`,
      `  "${p.techStack.slice(0, 4).join('", "')}"]`,
    ],
    accent: "none",
  });

  // A problem/approach text fact to round out the scene
  if (p.problem) {
    tiles.push({
      id: `${p.id}-problem`,
      type: "text",
      label: "problem",
      body: firstLine(p.problem),
      accent: "none",
    });
  }

  return tiles.slice(0, 8);
}

// ---------------------------------------------------------------------------
// default — the overview the visitor sees first (beautiful with zero input).
// ---------------------------------------------------------------------------

const flagship = projects.find((p) => p.flagship) ?? projects[0];
const usersMetric = metric("users");
const naspo = award("naspo-gold");

// The default bento is an INVITATION, not a stats board. The hero directly
// above already carries the headline numbers (500K+/20+/5+ yrs) — repeating
// them here reads as padding. These tiles say: who, what's featured, what's
// proven, and how to play.
const defaultScene: BentoTileData[] = [
  {
    id: "d-who",
    type: "text",
    label: "hi, I'm Dhruv",
    body: "I build systems people depend on — right now, AI for state government at the Burnes Center.",
    accent: "terracotta",
  },
  {
    id: "d-flagship",
    type: "project",
    name: flagship.name,
    desc: flagship.subtitle,
    sceneId: flagship.sceneId,
    accent: accentForColor(flagship.accentColor),
  },
  {
    id: "d-try",
    type: "text",
    label: "try asking",
    body: "“why should I hire you?” · “how does GENIE route models?” · “what do you do for fun?”",
    accent: "none",
  },
  {
    id: "d-award",
    type: "award",
    title: naspo?.title ?? "NASPO Cronin Gold Award",
    issuer: naspo?.issuer ?? "NASPO",
    year: naspo?.year ?? "2025",
    accent: "purple",
  },
  {
    id: "d-now",
    type: "text",
    label: "currently",
    body: "Technical Lead at the Burnes Center — shipping AI tools for state agencies and mentoring the engineers who build them.",
    accent: "none",
  },
  {
    id: "d-location",
    type: "text",
    label: "based in",
    body: `${profile.location} — originally from ${profile.origin}.`,
    accent: "none",
  },
  {
    id: "d-gpa",
    type: "metric",
    label: "M.S. AI · Northeastern",
    value: String(profile.education[0].gpa ?? "3.83"),
    note: "GPA",
    accent: "none",
  },
  {
    id: "d-offduty",
    type: "text",
    label: "off duty",
    body: "Valorant, cooking experiments, pani puri pilgrimages, PC builds.",
    accent: "none",
  },
];

// ---------------------------------------------------------------------------
// impact — the headline impact numbers + the marquee award.
// ---------------------------------------------------------------------------

const impactScene: BentoTileData[] = [
  ...impactMetrics.slice(0, 7).map((m, i): MetricTile => ({
    id: `imp-${m.id}`,
    type: "metric",
    label: m.label,
    value: m.value,
    note: m.description,
    accent: i === 0 ? "terracotta" : "none",
  })),
  {
    id: "imp-award",
    type: "award",
    title: naspo?.title ?? "NASPO Cronin Gold Award",
    issuer: naspo?.issuer ?? "NASPO",
    year: naspo?.year ?? "2025",
    accent: "purple",
  } satisfies AwardTile,
].slice(0, 8);

// ---------------------------------------------------------------------------
// stack — the skill groups, top skills per category.
// ---------------------------------------------------------------------------

const categoryAccent: Record<string, TileAccent> = {
  llm: "purple",
  cloud: "blue",
  languages: "teal",
  data: "terracotta",
  frameworks: "terracotta",
};

const stackScene: BentoTileData[] = [
  ...skillCategories.map((cat): TextTile => {
    const top = skills
      .filter((s) => s.category === cat.id)
      .sort((a, b) => b.proficiency - a.proficiency)
      .slice(0, 4)
      .map((s) => s.name.replace(/\s*\(.*\)/, ""));
    return {
      id: `stack-${cat.id}`,
      type: "text",
      label: cat.label,
      body: top.join(" · "),
      accent: categoryAccent[cat.id] ?? "none",
    };
  }),
  {
    id: "stack-count",
    type: "metric",
    label: "Technologies",
    value: `${skills.length}+`,
    note: "across LLM, cloud, data & frameworks",
    accent: "terracotta",
  } satisfies MetricTile,
  {
    id: "stack-core",
    type: "code",
    label: "core",
    lines: [`langs = ["Python", "TypeScript"]`, `cloud = "AWS"`, `ai = "Bedrock · Claude · RAG"`],
    accent: "none",
  } satisfies CodeTile,
  {
    id: "stack-claude",
    type: "metric",
    label: "Claude · Bedrock · RAG",
    value: "95%",
    note: "primary working depth",
    accent: "purple",
  } satisfies MetricTile,
].slice(0, 8);

// ---------------------------------------------------------------------------
// story — the Bangalore → Boston arc + a little personality.
// ---------------------------------------------------------------------------

const bangalore = timeline.find((t) => t.id === "bangalore");
const crossing = timeline.find((t) => t.id === "northeastern");
const scale = timeline.find((t) => t.id === "scale");

const storyScene: BentoTileData[] = [
  {
    id: "story-from",
    type: "text",
    label: "2018 — Bangalore",
    body: bangalore ? firstLine(bangalore.description) : "Shipped a Flutter ERP to 20K+ daily users.",
    accent: "none",
  },
  {
    id: "story-cross",
    type: "text",
    label: "2022 — crossing oceans",
    body: crossing ? firstLine(crossing.description) : "Moved to Boston for an M.S. in AI at Northeastern.",
    accent: "teal",
  },
  {
    id: "story-flutter",
    type: "metric",
    label: "First thing I shipped",
    value: "100 → 20K+",
    note: "daily users · Acharya ERP",
    accent: "none",
  },
  {
    id: "story-now",
    type: "text",
    label: "now — Boston",
    body: scale ? firstLine(scale.description) : "Technical lead across 26 AI tools for 500K+ users.",
    accent: "terracotta",
  },
  {
    id: "story-reach",
    type: "metric",
    label: "Users Served",
    value: usersMetric?.value ?? "500K+",
    accent: "terracotta",
  },
  {
    id: "story-food",
    type: "text",
    label: "off the clock",
    body: "Vegetarian foodie & cook — pani puri is non-negotiable.",
    accent: "none",
  },
  {
    id: "story-games",
    type: "text",
    label: "games",
    body: profile.interests.games,
    accent: "purple",
  },
  {
    id: "story-trip",
    type: "text",
    label: "favorite trip",
    body: profile.interests.favTrip,
    accent: "teal",
  },
];

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const bentoScenes: Record<SceneId, BentoTileData[]> = {
  default: defaultScene,
  genie: projectScene("genie"),
  aiep: projectScene("aiep"),
  vct: projectScene("vct"),
  "one-l": projectScene("one-l"),
  "knowledge-agent": projectScene("knowledge-agent"),
  "smart-model": projectScene("smart-model"),
  rag: projectScene("rag"),
  flutter: projectScene("flutter"),
  impact: impactScene,
  stack: stackScene,
  story: storyScene,
};

/** Human-readable label announced to screen readers on scene change. */
export const sceneLabels: Record<SceneId, string> = {
  default: "Overview",
  genie: "GENIE — AI sandbox",
  aiep: "A-IEP — accessible IEP documents",
  vct: "VCT Scout — esports GenAI",
  "one-l": "One-L + ABE — procurement AI",
  "knowledge-agent": "knowledge-agent-for-impact — RAG platform",
  "smart-model": "Smart Model Selector",
  rag: "Reusable RAG pipeline",
  flutter: "Acharya ERP — where the shipping started",
  impact: "Impact at scale",
  stack: "Technical stack",
  story: "Bangalore to Boston",
};

export function getScene(id: SceneId): BentoTileData[] {
  return bentoScenes[id] ?? defaultScene;
}

const ALL_SCENE_IDS = Object.keys(bentoScenes) as SceneId[];

export function isSceneId(value: string): value is SceneId {
  return (ALL_SCENE_IDS as string[]).includes(value);
}

// ---------------------------------------------------------------------------
// Keyword matcher (fallback / no-API mode + post-stream classification)
// ---------------------------------------------------------------------------

/** Weighted patterns per scene. Strong = names/unambiguous terms (weight 3),
 *  medium = domain terms (2), weak = broad hints (1). Scored across ALL
 *  scenes — best total wins — so a broad word can't hijack a specific ask. */
interface ScoredRule {
  scene: SceneId;
  strong?: RegExp[];
  medium?: RegExp[];
  weak?: RegExp[];
}

const SCORED_RULES: ScoredRule[] = [
  {
    scene: "genie",
    strong: [/\bgenie\b/, /44\s?k/, /state employees?/, /governor/],
    medium: [/sandbox/, /multi[- ]?model/, /side[- ]?by[- ]?side/],
  },
  {
    scene: "aiep",
    strong: [/a-?iep/, /\biep\b/, /individualized education/, /special ed/],
    medium: [/families/, /parents?/, /translat/, /school district/],
  },
  {
    scene: "vct",
    strong: [/\bvct\b/, /valorant/, /riot/, /re:?invent/, /esports/],
    medium: [/hackathon/, /scout/, /game logs?/, /tournament/, /competition/],
  },
  {
    scene: "one-l",
    strong: [/one-?l\b/, /\babe\b/, /naspo/, /procurement/],
    medium: [/contracts?/, /legal/, /redlin/, /lawyers?/, /observability/, /ragas/],
  },
  {
    scene: "knowledge-agent",
    strong: [/knowledge[- ]?agent/, /reusable rag/, /rag platform/],
    medium: [/opensearch/, /deployments?/, /platform/],
  },
  {
    scene: "smart-model",
    strong: [/smart model/, /model select/, /model rout/],
    medium: [/routing/, /cheapest/, /cost cut/, /14 models/],
  },
  {
    scene: "rag",
    strong: [/\brag\b/, /retrieval[- ]augmented/],
    medium: [/retrieval/, /hallucinat/, /langchain/, /embeddings?/, /vector/],
    weak: [/pipelines?/],
  },
  {
    scene: "flutter",
    strong: [/flutter/, /acharya/, /\berp\b/, /\bdart\b/],
    medium: [/mobile/, /android|ios|app store|play store/, /bangalore/, /razorpay/, /firebase/],
  },
  {
    scene: "impact",
    strong: [
      /impact/, /why (should|would).*(hire|pick|choose)/, /hire you/, /hiring/,
      /awards?/, /recogni[sz]/, /proof|receipts?|credib/,
    ],
    medium: [
      /how many/, /numbers?/, /metrics?/, /500\s?k/, /scale/, /reach/,
      /users? (served|reached)/, /mentor/, /lead(er)?ship/, /achievements?/,
      /accomplish/, /best work/, /proud/, /what.*(build|built|made|created|shipped)/,
      /projects?\b/, /your work/, /portfolio/,
    ],
    weak: [/users?/, /results?/],
  },
  {
    scene: "stack",
    strong: [
      /\bstack\b/, /skills?/, /technolog/, /\baws\b/, /kubernetes|k8s/, /docker/,
      /terraform|cdk|iac/, /bedrock/, /\bclaude\b|anthropic|openai|gpt/,
    ],
    medium: [
      /tech\b/, /tools?/, /languages?/, /python|typescript|javascript|java\b|c\+\+|sql/,
      /react|next\.?js/, /cloud/, /backend|frontend|full[- ]?stack/, /devops|ci\/?cd/,
      /lambda|dynamodb|step functions?/, /databases?|postgres|pinecone|faiss|neo4j/,
    ],
    weak: [/build with/, /use\b/],
  },
  {
    scene: "story",
    strong: [
      /\bstory\b/, /journey/, /who are you/, /who is (dhruv|this)/, /about you(rself)?/,
      /tell me about you/, /background/, /education|degree|gpa|northeastern|masters?|university/,
    ],
    medium: [
      /food|cook|pani ?puri|vegetarian/, /gam(e|ing)|cs2|fortnite/, /hobb/,
      /fun|personal|off[- ]?duty/, /boston/, /india/, /experience\b/, /career/,
      /grow(th| up)/, /where (are|did) you/,
    ],
  },
];

/** Map a free-text question to the best scene id (local, no network).
 *  Scores every scene and returns the top hit; "default" only when nothing
 *  matches at all. */
export function matchScene(query: string): SceneId {
  const q = query.toLowerCase();
  let best: SceneId = "default";
  let bestScore = 0;

  for (const rule of SCORED_RULES) {
    let score = 0;
    rule.strong?.forEach((re) => re.test(q) && (score += 3));
    rule.medium?.forEach((re) => re.test(q) && (score += 2));
    rule.weak?.forEach((re) => re.test(q) && (score += 1));
    if (score > bestScore) {
      bestScore = score;
      best = rule.scene;
    }
  }
  return best;
}

// ---------------------------------------------------------------------------
// Canned answer lines for fallback (no-API) mode — one editorial sentence.
// ---------------------------------------------------------------------------

const flagshipUsers = usersMetric?.value ?? "500K+";

export const cannedAnswers: Record<SceneId, string> = {
  // Honest no-match: offline mode shouldn't pretend it understood.
  default: `Offline demo — I can't field that exact one without my API brain. Try asking about GENIE, the hackathon win, my stack, or my story.`,
  genie: "GENIE is a secure multi-model AI sandbox I shipped to 44K+ state employees — 14 models, smart routing, 40% lower cost.",
  aiep: "A-IEP turns 50-100 page special-education plans into something families actually understand — a 7-stage pipeline, 4 languages, co-designed with parents.",
  vct: "VCT Scout placed 2nd of 3,300+ teams at AWS re:Invent — Bedrock Agents over 1TB+ of Valorant logs to help managers build rosters.",
  "one-l": "One-L cut legal review time 83% with an 11-stage Step Functions + Claude pipeline, and won the 2025 NASPO Cronin Gold Award.",
  "knowledge-agent": "knowledge-agent-for-impact is the reusable RAG platform every other tool builds on — 10+ deployments, 500K+ users.",
  "smart-model": "The Smart Model Selector routes each query across 14 models by task, cost, and tokens — cutting model spend 40%.",
  rag: "I built a reusable CI/CD RAG pipeline with LangChain — +20% retrieval accuracy, 40% fewer hallucinations.",
  flutter: "Acharya ERP is where the shipping started — a Flutter app I grew from 100 to 20K+ daily users, 1.2 to 4.5 stars.",
  impact: `Judge me by what shipped: ${flagshipUsers} users across 20+ agencies, 83% faster legal review, a NASPO Gold Award — and 50+ engineers I've mentored along the way. That's the case for hiring me.`,
  stack: "Core stack is Python + TypeScript on AWS — Bedrock, Claude, RAG, Step Functions, CDK, Lambda. Frontend in React/Next.",
  story: "Bangalore to Boston: from a Flutter app with 20K+ users, to an M.S. in AI at Northeastern, to building AI for half a million people.",
};
