import { projects } from "@/content";

/**
 * Keyword matching for the scripted tour. No model is involved: this is a small
 * weighted lexicon with typo tolerance (one transposition or slip per word),
 * plus an index over the project content so a technology named in the request
 * can be mapped to the projects whose stack or description contains it.
 */

export type Intent =
  | "food"
  | "gamer"
  | "designer"
  | "founder"
  | "student"
  | "hiring"
  | "engineer"
  | "offduty"
  | "contact"
  | "intro"
  | "surprise";

/* ---------- text helpers ---------- */

const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Edit distance where swapping two neighbouring letters counts as one slip. */
export function distance(a: string, b: string): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > 2) return 3;
  const rows: number[][] = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) rows[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        rows[i][j] = Math.min(rows[i][j], rows[i - 2][j - 2] + 1);
      }
    }
  }
  return rows[a.length][b.length];
}

const EXACT = 1;
const STEM = 0.9;
const TYPO = 0.8;
const MIN_FUZZY_LENGTH = 5;

/** How well a typed word matches a known term: 0 for no match. */
export function similarity(word: string, term: string): number {
  if (word === term) return EXACT;
  if (term.length < MIN_FUZZY_LENGTH || word.length < MIN_FUZZY_LENGTH - 1) return 0;
  if (word.startsWith(term) && word.length - term.length <= 4) return STEM;
  return distance(word, term) <= 1 ? TYPO : 0;
}

/* ---------- intent lexicon ---------- */

type Lexicon = { strong: string[]; weak?: string[]; phrases?: string[] };

const STRONG = 1;
const WEAK = 0.5;
const PHRASE = 1;

const LEXICON: Record<Exclude<Intent, "surprise">, Lexicon> = {
  food: {
    strong: ["pani", "puri", "golgappa", "puchka", "food", "hungry", "cook", "cooking", "eat", "eating", "snack", "snacks", "recipe", "dinner", "lunch", "chaat", "cuisine"],
  },
  gamer: {
    strong: ["valorant", "cs2", "csgo", "counterstrike", "gamer", "gaming", "game", "games", "fps", "esports", "esport", "fortnite", "aim"],
    phrases: ["counter strike"],
  },
  designer: {
    strong: ["designer", "design", "ux", "ui", "typography", "creative", "brand", "branding", "visual", "aesthetic"],
    weak: ["look", "art"],
  },
  founder: {
    strong: ["founder", "cofounder", "startup", "startups", "bootstrapped", "bootstrap", "vc", "investor", "founding", "venture"],
    phrases: ["my company", "my startup", "co founder", "series a", "early stage", "first engineer", "first hire"],
  },
  student: {
    strong: ["student", "intern", "internship", "learn", "learning", "mentor", "mentorship", "career", "bootcamp", "university", "beginner", "junior", "advice", "graduate"],
    phrases: ["break into", "get into"],
  },
  hiring: {
    strong: ["hire", "hiring", "hired", "hires", "recruit", "recruiter", "recruiting", "job", "role", "candidate", "resume", "cv", "position", "opening", "interview", "talent", "employ"],
    weak: ["team"],
    phrases: ["need someone", "looking for", "join our", "join us", "open role"],
  },
  engineer: {
    strong: ["infra", "infrastructure", "backend", "devops", "cloud", "aws", "architect", "architecture", "rag", "platform", "hardest", "scale", "scalable", "technical", "pipeline", "pipelines", "production", "deploy", "deployment", "serverless", "llm", "llms", "agents", "agent", "retrieval", "mlops"],
    weak: ["engineer", "engineering", "system", "systems", "code"],
  },
  offduty: {
    strong: ["fun", "hobby", "hobbies", "offduty", "personal", "human", "weekend"],
    phrases: ["off duty", "outside work", "for fun", "free time"],
  },
  contact: {
    strong: ["contact", "email", "mail", "reach", "connect"],
    phrases: ["get in touch", "talk to", "reach out"],
  },
  intro: {
    strong: ["dhruv", "db", "meet", "introduce"],
    phrases: ["who is", "who are", "tell me about", "about him", "about you", "about yourself", "about db", "about dhruv"],
  },
};

/** Ties go to the earlier intent. */
const PRIORITY: Intent[] = ["food", "gamer", "designer", "founder", "student", "hiring", "engineer", "offduty", "contact", "intro"];

const INFRA_TERMS = ["infra", "infrastructure", "backend", "devops", "cloud", "aws", "architecture", "systems", "pipeline", "hardest"];
const RAG_TERMS = ["rag", "retrieval", "vector", "embeddings", "chatbot", "chatbots", "knowledge"];

function hasAny(tokens: string[], terms: string[]): boolean {
  return tokens.some((t) => terms.some((term) => similarity(t, term) > 0));
}

function scoreIntent(tokens: string[], text: string, lex: Lexicon): number {
  const best = (term: string) => tokens.reduce((m, t) => Math.max(m, similarity(t, term)), 0);
  const strong = lex.strong.reduce((sum, term) => sum + best(term) * STRONG, 0);
  const weak = (lex.weak ?? []).reduce((sum, term) => sum + best(term) * WEAK, 0);
  const phrases = (lex.phrases ?? []).reduce((sum, p) => sum + (` ${text} `.includes(` ${p} `) ? PHRASE : 0), 0);
  return strong + weak + phrases;
}

/* ---------- project index ---------- */

const STOP = new Set(
  "a an and any are as at be but by can for from get give had has have he her him his how i if im in into is it its just like me more my no not of on one or our out over please show some someone something somethings tell that the their them then there these they this to up us was we what when where which who why will with would you your ai about need want looking built build make made use using used work works stuff thing things also very much really tour cut take".split(" "),
);

/** Words a visitor might use that point at a category of project, not a technology. */
const CATEGORY_TERMS: Record<string, string[]> = {
  "gov-ai": ["government", "civic", "gov", "agency", "agencies", "policy", "public"],
  platform: ["platform"],
  hackathon: ["hackathon", "competition", "esports"],
  mobile: ["mobile", "app", "apps", "ios", "android"],
  lab: ["research", "coursework", "vision"],
  tool: ["tool", "cli", "developer", "npm"],
};

/** Looser names for the same thing: the key is what people type, the values are index terms. */
const SYNONYMS: Record<string, string[]> = {
  rag: ["rag", "opensearch", "weaviate", "kendra"],
  retrieval: ["rag", "opensearch", "weaviate", "kendra"],
  vector: ["opensearch", "weaviate"],
  embeddings: ["opensearch", "weaviate"],
  search: ["opensearch", "kendra", "weaviate"],
  chatbot: ["rag", "chatbots"],
  chatbots: ["rag", "chatbots"],
  llm: ["openai", "claude", "bedrock", "mistral"],
  llms: ["openai", "claude", "bedrock", "mistral"],
  gpt: ["openai"],
  serverless: ["lambda"],
  cloud: ["aws"],
  frontend: ["react", "vite"],
  backend: ["lambda", "hono", "dynamodb"],
  api: ["lambda", "hono", "rest"],
  database: ["dynamodb", "firebase"],
  db: ["dynamodb", "firebase"],
  ml: ["pytorch", "tensorflow"],
  cv: ["pytorch", "tensorflow", "vision"],
  js: ["typescript", "node", "react"],
  javascript: ["typescript", "node", "react"],
  ts: ["typescript"],
  node: ["node", "nodejs"],
  agents: ["mcp", "agents", "agent"],
  agent: ["mcp", "agents", "agent"],
  ios: ["flutter"],
  android: ["flutter"],
  text: ["sms"],
  texting: ["sms"],
  speech: ["voice", "realtime"],
  audio: ["voice", "realtime"],
};

type IndexEntry = { slug: string; term: string; label: string; kind: "stack" | "text" | "category" };

const KIND_WEIGHT = { stack: 1, text: 0.6, category: 0.5 } as const;

let cachedIndex: IndexEntry[] | null = null;

function buildIndex(): IndexEntry[] {
  const out: IndexEntry[] = [];
  const add = (slug: string, term: string, label: string, kind: IndexEntry["kind"]) => {
    if (term.length >= 2 && !STOP.has(term)) out.push({ slug, term, label, kind });
  };
  for (const p of projects) {
    for (const entry of p.stack) {
      const words = normalize(entry).split(" ");
      for (const w of words) add(p.slug, w, entry, "stack");
      if (words.length > 1) add(p.slug, words.join(""), entry, "stack");
    }
    for (const w of normalize(`${p.name} ${p.tagline}`).split(" ")) add(p.slug, w, p.name, "text");
    for (const w of CATEGORY_TERMS[p.category] ?? []) add(p.slug, w, w, "category");
  }
  return out;
}

export type ProjectHit = {
  slug: string;
  score: number;
  /** Stack entries that matched, e.g. "React". */
  stack: string[];
  /** Words from the request that matched only the name, tagline or category. */
  words: string[];
};

export type TechMatch = {
  hits: ProjectHit[];
  /** Every word in the request that matched something. */
  words: string[];
  /** The subset that matched a stack entry, i.e. a technology rather than a topic. */
  techWords: string[];
};

const MAX_HITS = 3;
const MIN_HIT_SCORE = 0.5;

/** Map the technologies and topics in a request onto projects, best first. */
export function matchProjects(prompt: string): TechMatch {
  const index = (cachedIndex ??= buildIndex());
  const tokens = [...new Set(normalize(prompt).split(" "))].filter((t) => t.length >= 2 && !STOP.has(t));
  const byProject = new Map<string, ProjectHit>();
  const used = new Set<string>();
  const tech = new Set<string>();

  for (const token of tokens) {
    const wanted = [token, ...(SYNONYMS[token] ?? [])];
    const seen = new Set<string>();
    for (const e of index) {
      if (seen.has(e.slug + e.term)) continue;
      const sim = wanted.reduce((m, w) => Math.max(m, w === token ? similarity(token, e.term) : similarity(w, e.term)), 0);
      if (!sim) continue;
      seen.add(e.slug + e.term);
      used.add(token);
      const hit = byProject.get(e.slug) ?? { slug: e.slug, score: 0, stack: [], words: [] };
      hit.score += sim * KIND_WEIGHT[e.kind];
      if (e.kind === "stack") {
        tech.add(token);
        if (!hit.stack.includes(e.label)) hit.stack.push(e.label);
      } else if (!hit.words.includes(token)) hit.words.push(token);
      byProject.set(e.slug, hit);
    }
  }

  const order = new Map(projects.map((p, i) => [p.slug, i]));
  const hits = [...byProject.values()]
    .filter((h) => h.score >= MIN_HIT_SCORE)
    .sort((a, b) => b.score - a.score || (order.get(a.slug) ?? 0) - (order.get(b.slug) ?? 0))
    .slice(0, MAX_HITS);
  return { hits, words: tokens.filter((t) => used.has(t)), techWords: tokens.filter((t) => tech.has(t)) };
}

/* ---------- the verdict ---------- */

export type Match = {
  intent: Intent | null;
  score: number;
  infra: boolean;
  rag: boolean;
  tech: TechMatch;
};

/** An intent that scores this much is trusted over a keyword composition. */
const CONFIDENT = 1;
const MIN_SCORE = 0.5;

export function matchIntent(prompt: string): Match {
  const text = normalize(prompt);
  const tokens = text.split(" ").filter(Boolean);
  const tech = matchProjects(prompt);
  const infra = hasAny(tokens, INFRA_TERMS);
  const rag = hasAny(tokens, RAG_TERMS);

  if (/\bsurprise\b/.test(text)) return { intent: "surprise", score: CONFIDENT, infra, rag, tech };

  const scored = PRIORITY.map((intent, order) => ({
    intent,
    order,
    score: scoreIntent(tokens, text, LEXICON[intent as keyof typeof LEXICON]),
  }))
    .filter((s) => s.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.order - b.order);

  const top = scored[0];
  if (top && (top.score >= CONFIDENT || tech.hits.length === 0)) {
    return { intent: top.intent, score: top.score, infra, rag, tech };
  }
  return { intent: null, score: top?.score ?? 0, infra, rag, tech };
}
