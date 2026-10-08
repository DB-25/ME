import { METRIC_LABELS, PROJECT_NAMES } from "./knowledge";
import type { DirectorAction } from "./protocol";

/**
 * Evidence follows the words. When a sentence names a project or quotes a headline number, the site
 * should be showing that project or number while it is said. The model is told this happens on its
 * own (see prompt.ts), so it only writes the sentence; this module reads the sentence and returns the
 * actions that show it. A project or figure is shown once per turn.
 */

/** Looser names a visitor or the model would use for the same project. */
const PROJECT_ALIASES: Record<string, string[]> = {
  genie: ["smart model", "generative ai sandbox"],
  "acharya-erp": ["acharya"],
  "abe-one-l": ["abe", "one-l"],
  "course-delivery": ["course delivery"],
  "coaching-tool": ["engagement coach"],
  "knowledge-agent-for-impact": ["knowledge agent"],
};

/**
 * What in a sentence means "this headline figure", keyed by the figure's label on the Impact chapter.
 * A figure is only lit by its number (or its program), never by a bare common word.
 */
const METRIC_PATTERNS: Record<string, RegExp> = {
  "IEPs read by A-IEP": /\b375\b/,
  "Monthly active users on Acharya ERP": /\b16,148\b|\b2,972\b/,
  "State employees with access": /\b44,000\b/,
  "AI tools shipped": /\b26 ai tools\b|\btwenty-six ai tools\b/,
  "Engineers mentored": /\b50\+? (student )?engineers\b|\bmentored\b/,
  "Place, AWS x Riot Games hackathon": /\bsecond place\b|\b2nd place\b|\bamazon web services and riot\b|\baws (x|and) riot\b/,
  "NASPO awards for ABE and One-L": /\bnaspo\b/,
};

/** Lowercase, straight hyphens and quotes, so "A‑IEP" (non-breaking hyphen) and "A-IEP" are one thing. */
const normalize = (text: string) =>
  text
    .toLowerCase()
    .replace(/[‐‑‒–]/g, "-")
    .replace(/[‘’]/g, "'");

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const wordRe = (needle: string) => new RegExp(`(?<![\\w-])${escape(normalize(needle))}(?![\\w-])`);

type ProjectMatcher = { slug: string; re: RegExp[] };
const PROJECT_MATCHERS: ProjectMatcher[] = Object.entries(PROJECT_NAMES).map(([slug, name]) => ({
  slug,
  re: [slug, name, ...(PROJECT_ALIASES[slug] ?? [])].map(wordRe),
}));

const LABELS = new Set(METRIC_LABELS);
const METRIC_MATCHERS = Object.entries(METRIC_PATTERNS).filter(([label]) => LABELS.has(label));

/** An invitation to ask about something is not a claim about it: nothing is shown for it. */
const INVITATION = /\bask me\b|\bask about\b|\bask away\b/;

const CONTACT = /\bemail me\b|\bwrite to me\b|@[a-z0-9-]+\.[a-z]+|\bcontact chapter\b|\breach me\b/;

/** The ids of everything an action shows, so the same thing is not shown twice in a turn. */
export const shownKey = (action: DirectorAction): string | null => {
  switch (action.name) {
    case "show_project":
    case "open_case_study":
      return `project:${action.args.slug}`;
    case "show_metric":
      return `metric:${action.args.label}`;
    case "goto_chapter":
      return `chapter:${action.args.chapter}`;
    default:
      return null;
  }
};

/**
 * The actions that show what one sentence says. A headline number lights its figure; otherwise a named
 * project is spotlighted; an invitation to email goes to the contact chapter. Things already in `shown`
 * are skipped. At most one navigation per sentence, so the page never lurches twice under one line.
 */
export function evidenceFor(sentence: string, shown: ReadonlySet<string>): DirectorAction[] {
  const text = normalize(sentence);
  if (INVITATION.test(text)) return [];

  for (const [label, pattern] of METRIC_MATCHERS) {
    if (pattern.test(text) && !shown.has(`metric:${label}`)) return [{ name: "show_metric", args: { label } }];
  }
  for (const { slug, re } of PROJECT_MATCHERS) {
    if (re.some((r) => r.test(text)) && !shown.has(`project:${slug}`)) return [{ name: "show_project", args: { slug } }];
  }
  if (CONTACT.test(text) && !shown.has("chapter:contact")) return [{ name: "goto_chapter", args: { chapter: "contact" } }];
  return [];
}
