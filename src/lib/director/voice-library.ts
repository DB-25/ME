import { metrics, profile, projects } from "@/content";
import type { Metric } from "@/content";
import { lineId } from "./lineId";

/**
 * The voice library: every sentence the Director can say aloud, in DB's own voice.
 *
 * It is the single source of truth. The scripted tour speaks lines from here; the
 * live model picks lines from here by id (the `speak` action); and
 * scripts/voice/lines.mjs exports the whole list as scripts/voice/lines.json, one
 * recording per entry, saved as public/voice/<id>.mp3.
 *
 * Rules for a line: first person, numbers written the way they are spoken, under
 * about eighteen words, calm. A line's id is a hash of its exact text, so editing a
 * word makes a new id and the old recording is simply no longer used.
 */

export type VoiceLine = { id: string; text: string; tags: string[] };

const make = (text: string, tags: string[]): VoiceLine => ({ id: lineId(text), text, tags });

/* ---------- numbers, spoken ---------- */

const ONES = [
  "zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "eleven", "twelve",
  "thirteen", "fourteen", "fifteen", "sixteen", "seventeen", "eighteen", "nineteen",
];
const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];

function belowThousand(n: number): string {
  const hundreds = Math.floor(n / 100);
  const rest = n % 100;
  const tail = rest < 20 ? (rest ? ONES[rest] : "") : `${TENS[Math.floor(rest / 10)]}${rest % 10 ? `-${ONES[rest % 10]}` : ""}`;
  return [hundreds ? `${ONES[hundreds]} hundred` : "", tail].filter(Boolean).join(" ");
}

function integerWords(n: number): string {
  if (n === 0) return "zero";
  const thousands = Math.floor(n / 1000);
  return [thousands ? `${belowThousand(thousands)} thousand` : "", n % 1000 ? belowThousand(n % 1000) : ""]
    .filter(Boolean)
    .join(" ");
}

const yearWords = (n: number): string => {
  const head = Math.floor(n / 100);
  const tail = n % 100;
  if (tail === 0) return `${integerWords(head)} hundred`;
  return `${integerWords(head)} ${tail < 10 ? `oh ${ONES[tail]}` : integerWords(tail)}`;
};

const ORDINALS: Record<string, string> = { "1st": "first", "2nd": "second", "3rd": "third", "4th": "fourth", "5th": "fifth" };

/** Write numerals the way they are said: "20,000+" is "more than twenty thousand", "2025" is "twenty twenty-five". */
export function speakable(text: string): string {
  return text
    .replace(/\b[1-5](st|nd|rd|th)\b/g, (m) => ORDINALS[m] ?? m)
    .replace(/\b(\d[\d,]*)(\.\d+)?(\+)?(%)?(?![\w])/g, (_m, whole: string, decimal: string | undefined, plus, percent) => {
      const digits = whole.replace(/,/g, "");
      const isYear = !whole.includes(",") && !decimal && !plus && !percent && digits.length === 4 && +digits >= 1900 && +digits <= 2099;
      let words = isYear ? yearWords(+digits) : integerWords(+digits);
      if (decimal) words += ` point ${[...decimal.slice(1)].map((d) => ONES[+d]).join(" ")}`;
      if (percent) words += " percent";
      return plus ? `more than ${words}` : words;
    });
}

/* ---------- authored lines ---------- */

/** Text first, then tags. The key is how scripts refer to the line. */
const AUTHORED = {
  /* the scripted tour: founder. A-IEP, Course Delivery, Public Voice, then the ask. */
  founderOpen: ["A founder. Can I ship, and keep it running? Here are three proofs.", "tour", "founder"],
  founderAiep: [
    "A-IEP: more than three hundred seventy-five special-education plans, read in plain language.",
    "tour", "founder", "project:a-iep",
  ],
  founderAiepOwned: [
    "I took it from prototype to production, and built its processing pipeline and privacy design.",
    "tour", "founder", "owned", "project:a-iep",
  ],
  founderCourse: [
    "Course Delivery, an eight-day course paced by text: sole engineer, built in three days, pre-launch.",
    "tour", "founder", "project:course-delivery",
  ],
  founderVoice: [
    "Public Voice is live at InnovateUS: a voice survey with one smart follow-up. I am the technical lead.",
    "tour", "founder", "project:public-voice",
  ],
  founderClose: ["Tell me what you are building. The email is the large link.", "tour", "founder", "closer"],
  /* the long founder story, for the live model and keyword composition */
  founderAcharya: [
    "Before that, a Flutter app used by about seventeen thousand students and staff. I owned it from design to deployment.",
    "tour", "founder", "project:acharya-erp",
  ],
  acharyaRating: ["The store rating went from one point two to four point five.", "tour", "metric", "project:acharya-erp"],
  founderArc: [
    "And a tool of my own: arc-control-mcp, an MCP server with twenty-six tools, published on npm.",
    "tour", "founder", "project:arc-control-mcp",
  ],

  /* hiring: ownership and scale */
  hiringOpen: ["Hiring. The short version is what I owned, and how far it reached.", "tour", "recruiter"],
  hiringAiep: [
    "I lead A-IEP's engineering, from the pipeline to the privacy design.",
    "tour", "recruiter", "owned", "project:a-iep",
  ],
  accessCaveat: ["That counts access, not daily use.", "tour", "metric", "honest"],
  hiringAbe: [
    "ABE and One-L won NASPO awards before I joined. I lead ABE's monitoring and One-L's direction.",
    "tour", "recruiter", "owned", "project:abe-one-l",
  ],
  hiringScale: [
    "Across AI for Impact, twenty-six tools have shipped. I help lead the technical side.",
    "tour", "recruiter", "metric",
  ],
  hiringClose: ["If that is the scope you need, the email is the large link.", "tour", "recruiter", "closer"],
  hiringAudit: ["I audit my own work too.", "tour", "recruiter", "honest"],
  hiringAuditDetail: [
    "A-IEP's only automated check was a schema check, so I started a benchmark.",
    "tour", "recruiter", "honest", "project:a-iep",
  ],
  hiringProof: ["Awards and press are listed with their sources.", "tour", "recruiter", "proof"],

  /* engineer: architecture, privacy, evals, a tool of my own */
  engineerOpen: ["The hardest problem is private data.", "tour", "engineer"],
  engineerRagOpen: ["Retrieval and infrastructure. Two problems, one stack.", "tour", "engineer"],
  engineerPipeline: ["A-IEP: upload, OCR, redact, summarize, translate, on Step Functions.", "tour", "engineer", "project:a-iep"],
  engineerPrivacy: [
    "Only OCR sees the original page. A language model reads redacted text, and any failure purges the unredacted artifacts.",
    "tour", "engineer", "project:a-iep",
  ],
  engineerEvals: [
    "Then measurement: A-IEP's only automated check was a schema check. I started a benchmark; the design is public, no results yet.",
    "tour", "engineer", "honest", "project:a-iep",
  ],
  engineerArc: [
    "arc-control-mcp: twenty-six tools, sixteen test files, and it never touches the tab I am reading.",
    "tour", "engineer", "project:arc-control-mcp",
  ],
  engineerClose: ["If this is the engineering you need, the email is the large link.", "tour", "engineer", "closer"],
  engineerPii: [
    "I redact names and other identifiers before a language model reads a word, and I delete the original upload.",
    "tour", "engineer", "project:a-iep",
  ],
  engineerPurge: ["Any failure purges the unredacted artifacts.", "tour", "engineer", "project:a-iep"],
  engineerRag: [
    "For retrieval across agencies, I set the technical direction on knowledge-agent-for-impact.",
    "tour", "engineer", "project:knowledge-agent-for-impact",
  ],
  engineerRagStack: [
    "Amazon Kendra, Lambda, DynamoDB and Cognito.",
    "tour", "engineer", "project:knowledge-agent-for-impact",
  ],
  engineerRagHonest: [
    "Student engineers built it. I directed and reviewed the work.",
    "tour", "engineer", "honest", "project:knowledge-agent-for-impact",
  ],
  engineerMeasure: ["Then measurement. I found that A-IEP's only automated check was a schema check.", "tour", "engineer", "honest"],
  engineerBenchmark: ["So I started a synthetic benchmark. The evaluation design is public; no results are published yet.", "tour", "engineer", "project:a-iep"],

  /* designer */
  designerOpen: ["A designer. Worth knowing I hold the stylus too.", "tour", "designer"],
  designerField: ["This page is one field of particles that rearranges itself per chapter.", "tour", "designer"],
  designerSvg: ["The shapes you just watched are SVG, sampled into particles.", "tour", "designer"],

  /* student */
  studentOpen: ["A student. The path, briefly.", "tour", "student"],
  studentBangalore: [
    "Bangalore: a B.E. in Computer Science, then a Flutter app for thousands of students.",
    "tour", "student", "origin",
  ],
  studentBoston: [
    "Then Boston: an M.S. in AI at Northeastern, with a GPA of three point eight three.",
    "tour", "student", "origin",
  ],
  studentCoop: ["Co-op from January twenty twenty-four, full-time since July.", "tour", "student", "origin"],
  studentLesson: ["My lesson from the Flutter app: if it breaks, a real person has a bad day.", "tour", "student", "values"],

  /* gamer */
  gamerOpen: ["Valorant and CS2.", "tour", "gamer"],
  gamerVct: [
    "It is also how VCT Scout came about: second place at the AWS and Riot Games hackathon.",
    "tour", "gamer", "project:vct-scout",
  ],
  gamerScout: [
    "Ask in plain English, get a roster, built on more than four thousand seven hundred match files.",
    "tour", "gamer", "project:vct-scout",
  ],

  /* food and off duty */
  foodOpen: ["Pani puri. A reasonable thing to draw.", "tour", "offduty"],
  foodVegetarian: ["Vegetarian. Pani puri is my favorite dish.", "tour", "offduty"],
  foodKitchen: ["I cook Indian, Italian and Mexican.", "tour", "offduty"],
  offDutyOpen: ["Off duty. Black and purple, mostly.", "tour", "offduty"],
  offDutyGames: ["Valorant and CS2, and a plate of pani puri.", "tour", "offduty"],
  offDutyTrip: ["My favorite trip: Acadia National Park.", "tour", "offduty"],

  /* intro and contact */
  introName: ["I'm Dhruv, also known as DB.", "tour", "intro"],
  introRole: ["I'm an AI engineer at the Burnes Center, from Bangalore to Boston.", "tour", "intro"],
  introOneLiner: ["I ship AI products end to end, from first prototype to thousands of real users.", "tour", "intro"],
  introStart: [
    "Before Boston, I built a Flutter app for thousands of students. Now I ship to families and state agencies.",
    "tour", "intro", "origin",
  ],
  contactLine: ["The email is the large link. The resume is beside it.", "tour", "contact"],

  /* the short tour, and keyword composition */
  surpriseOpen: ["No brief. A short tour, then.", "tour", "curious"],
  noMatchOpen: [
    "This is a scripted tour: it matches keywords, and none of yours matched. Here is the short version.",
    "tour", "curious",
  ],
  composedOpen: ["This is a scripted tour, so it reads keywords. Here is where yours show up.", "tour", "curious"],
  composedClose: ["The rest is one email away.", "tour", "closer"],
  techPoint: ["One more thing your request points at.", "tour", "transition"],
  tourBangalore: ["Bangalore to Boston.", "tour", "origin"],
  tourPipeline: ["A pipeline that treats private data as a design input.", "tour", "engineer"],
  tourSources: ["Sources are on the page.", "tour", "proof"],

  /* greetings, by visitor */
  greetFounder: ["Hi, I'm Dhruv. If you're building something, here is what I've shipped.", "greeting", "founder"],
  greetRecruiter: ["Hi, I'm Dhruv. Here is what I've owned, and what it measured.", "greeting", "recruiter"],
  greetEngineer: ["Hi, I'm Dhruv. Let me show you how I build.", "greeting", "engineer"],
  greetDesigner: ["Hi, I'm Dhruv. I care how things look, and how they hold up.", "greeting", "designer"],
  greetStudent: ["Hi, I'm Dhruv. Here is how I got from Bangalore to Boston.", "greeting", "student"],
  greetGamer: ["Hi, I'm Dhruv. Yes, I play Valorant and CS2.", "greeting", "gamer"],
  greetCurious: ["Hi, I'm Dhruv. Have a look around, and I'll point out the parts worth seeing.", "greeting", "curious"],

  /* transitions */
  moveMatters: ["Here's the part that matters to you.", "transition"],
  moveHowItWorks: ["Let me show you how it works.", "transition"],
  moveNumbers: ["Look at the numbers.", "transition", "metric"],
  moveOneMore: ["One more thing.", "transition"],
  moveWork: ["Here is the work.", "transition", "work"],
  moveProof: ["Now the proof.", "transition", "proof"],
  moveCloser: ["A closer look.", "transition"],
  moveDraw: ["Let me draw that.", "transition", "draw"],

  /* honest deflections */
  deflectAsk: ["That one is better asked to me directly, by email.", "deflection"],
  deflectRecord: ["I don't have that on record.", "deflection"],
  deflectGuess: ["I'd rather not guess at that.", "deflection"],
  deflectScope: ["That is outside what I can speak to here.", "deflection"],
  deflectTalk: ["I'll leave that one for a conversation.", "deflection"],

  /* closers and contact */
  closeShort: ["That's the short version.", "closer"],
  closeTalk: ["The rest is a conversation.", "closer"],
  closeEmail: ["If any of this fits, send me an email.", "closer", "contact"],
  closeThanks: ["That's the cut. The site is yours again.", "closer"],
  closeLook: ["Take your time. Everything here has a source.", "closer"],
  contactEmail: ["My email is the large link at the bottom.", "contact"],
  contactResume: ["My resume is beside it.", "contact"],
  contactBest: ["Email is the best way to reach me.", "contact"],

  /* a closer look at the work, from the case studies */
  aiepRedact: [
    "A-IEP redacts names and other identifiers first, deletes the original upload, then writes a summary in nine sections.",
    "detail", "project:a-iep",
  ],
  aiepParents: ["Parents helped design it. I showed them the prompts, and their feedback reshaped the output.", "detail", "project:a-iep"],
  aiepLanguages: ["It runs in four languages: English, Spanish, Vietnamese and Chinese.", "detail", "project:a-iep"],
  aiepPilot: ["More than two hundred families joined the first San Francisco pilot.", "detail", "metric", "project:a-iep"],
  genieSandbox: ["GENIE gave Massachusetts state employees a safe sandbox for generative AI.", "detail", "project:genie"],
  genieCitation: ["The Governor's Office signed a citation for that work, in June twenty twenty-four.", "detail", "proof", "project:genie"],
  vctTeam: ["Four of us built VCT Scout in a hackathon sprint.", "detail", "project:vct-scout"],
  vctAward: ["It also won Best Cross-Regional Team Submission.", "detail", "proof", "project:vct-scout"],
  kaiBase: ["It's a reusable stack, so a new chatbot starts from a working base.", "detail", "engineer", "project:knowledge-agent-for-impact"],
  arcSafe: [
    "arc-control-mcp never touches the tab I'm looking at, and it reports missing permissions instead of failing silently.",
    "detail", "engineer", "project:arc-control-mcp",
  ],
  arcLean: ["It has two runtime dependencies and no build step.", "detail", "engineer", "project:arc-control-mcp"],
  curiousAsk: ["Ask for anything on this site, or just watch.", "greeting", "curious"],
  keepShort: ["I'll keep this short.", "transition"],
  askAgain: ["Ask again, and I'll cut it differently.", "closer"],

  /* about me */
  aboutRole: ["I'm an AI engineer at the Burnes Center for Social Change, at Northeastern.", "about"],
  aboutPath: ["I started in Bangalore, then moved to Boston for a master's in AI at Northeastern.", "about", "origin"],
  aboutJoined: ["I joined the Burnes Center as a co-op in January twenty twenty-four.", "about", "origin"],
  aboutAudience: ["I build AI products for people who are not engineers.", "about", "values"],
  buildingBenchmark: ["Right now I'm building a synthetic benchmark, so A-IEP can report accuracy.", "about", "now", "project:a-iep"],
  buildingCourse: ["I'm also building Course Delivery SMS, an eight-day video course paced by text.", "about", "now", "project:course-delivery"],
  buildingVoice: ["And Public Voice, a no-login voice survey that asks one follow-up.", "about", "now", "project:public-voice"],
  offDutyDesk: ["Off duty, I build PCs and mechanical keyboards, and I play Valorant and CS2.", "about", "offduty"],
  offDutyPrint: ["I 3D print whatever the desk needs next.", "about", "offduty"],
  offDutyColors: ["My colors are black and purple.", "about", "offduty"],
} as const satisfies Record<string, readonly [string, ...string[]]>;

type Key = keyof typeof AUTHORED;

/** Look a line up by the name scripts use for it. */
export const LINE = Object.fromEntries(
  Object.entries(AUTHORED).map(([key, [text, ...tags]]) => [key, make(text, tags)]),
) as Record<Key, VoiceLine>;

/* ---------- lines built from the content ---------- */

/** One line per project: what it is, in its own words. */
export const PROJECT_INTRO: Record<string, VoiceLine> = Object.fromEntries(
  projects.map((p) => [p.slug, make(`${p.name}. ${speakable(p.tagline)}`, ["project-intro", `project:${p.slug}`])]),
);

/** What I owned on a project, first person, only for projects whose content records it. */
const OWNED_TEXT: Record<string, string> = {
  "a-iep": "I took the earlier co-op prototype to production and built its processing pipeline and privacy design.",
  "acharya-erp": "I built the Flutter app and owned it from design to deployment, then trained interns to take over.",
  genie: "On the Burnes team's build, I wrote Smart Model, the router that picks a model per request.",
  "abe-one-l": "I joined ABE and One-L after their NASPO awards. I built ABE's monitoring and alarms, and direct One-L.",
  "vct-scout": "One of four on a hackathon team, I designed the agent's tool calling and wrote the system prompt that orchestrates it.",
  "public-voice": "I set the technical direction and built the prototype it grew from. Two teammates built most of the production code.",
  "course-delivery": "I was the sole engineer: the Lambda API, the SMS pacing, the quiz gate and the certificate.",
};

export const OWNED_LINE: Record<string, VoiceLine> = Object.fromEntries(
  projects
    .filter((p) => p.owned && OWNED_TEXT[p.slug])
    .map((p) => [p.slug, make(OWNED_TEXT[p.slug], ["owned", `project:${p.slug}`])]),
);

/** One sentence per headline number, keyed by its label. A new metric falls back to its value and label. */
const METRIC_TEXT: Record<string, string> = {
  "IEPs read by A-IEP": "More than three hundred seventy-five plans read in plain language.",
  "Users on Acharya ERP": "About seventeen thousand students and staff used the Acharya app.",
  "State employees with access": "More than forty-four thousand state employees have access to the sandbox I co-built.",
  "AI tools shipped": "The AI for Impact program has shipped twenty-six AI tools for government and civic partners.",
  "Engineers mentored": "I have mentored more than fifty student engineers, from prototype to production.",
  "Place, AWS x Riot Games hackathon": "Second place at the AWS and Riot Games hackathon, among more than three thousand two hundred participants.",
  "NASPO awards for ABE and One-L": "Two NASPO awards in twenty twenty-five went to ABE and One-L, before I joined either.",
  "Lower model spend": "A self-reported forty percent lower model spend, because Smart Model picks a model for each request.",
};

export function metricLine(m: Metric): VoiceLine {
  const tags = ["metric", ...(m.projectSlug ? [`project:${m.projectSlug}`] : [])];
  return make(METRIC_TEXT[m.label] ?? `${speakable(m.value)}. ${m.label}.`, tags);
}

/** DB's own principles, in his words. */
const MANIFESTO: VoiceLine[] = profile.manifesto.map((t) => make(speakable(t), ["values", "manifesto"]));

/* ---------- the library ---------- */

function unique(lines: VoiceLine[]): VoiceLine[] {
  const seen = new Map<string, VoiceLine>();
  for (const line of lines) {
    const prior = seen.get(line.id);
    if (prior && prior.text !== line.text) throw new Error(`voice line id collision: "${prior.text}" and "${line.text}"`);
    seen.set(line.id, prior ? { ...prior, tags: [...new Set([...prior.tags, ...line.tags])] } : line);
  }
  return [...seen.values()];
}

export const VOICE_LINES: VoiceLine[] = unique([
  ...Object.values(LINE),
  ...Object.values(PROJECT_INTRO),
  ...Object.values(OWNED_LINE),
  ...metrics.map(metricLine),
  ...MANIFESTO,
]);

const BY_ID = new Map(VOICE_LINES.map((l) => [l.id, l]));

/** The line with this id, or undefined. */
export const findLine = (id: string): VoiceLine | undefined => BY_ID.get(id);
