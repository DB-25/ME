import { metrics } from "./metrics";
import { profile } from "./profile";
import { projects } from "./projects";
import { basisOf } from "./provenance";
import { recognition } from "./recognition";
import { SRC } from "./sources";
import { timeline } from "./timeline";
import type { Basis, Metric, NoteStatus, Project, Recognition } from "./types";

/**
 * The claims ledger: every figure and factual claim the site shows, read from the same content files that render it
 * (metrics, case outcomes, production notes, recognition, profile). Nothing here is typed by hand except labels for
 * where a block lives. A profile sentence is read with a pattern that throws if the sentence changes, so a claim can
 * be edited or lost loudly, never drift quietly.
 */

export type LedgerLink = { label: string; href: string };
export type LedgerSource = { label: string; href?: string; isPrivate: boolean };
/** `sort` is an ISO-like string ("2026-07-00" when the day is unknown) and "" when the source gives no date. */
export type LedgerDate = { label: string; sort: string };

export type LedgerRow = {
  id: string;
  /** The number or short mark: "375+", "2nd", "Award", "Not measured". */
  value: string;
  claim: string;
  definition: string;
  appears: LedgerLink[];
  basis: Basis;
  source: LedgerSource;
  asOf: LedgerDate;
  /** Project slugs the claim belongs to; empty means site-wide. */
  projects: string[];
};

/** Production notes and the repo receipts were read from the repositories on this date (see notes.ts and sources.ts). */
const REPO_READ: LedgerDate = { label: "4 Oct 2026", sort: "2026-10-04" };
const UNDATED: LedgerDate = { label: "Undated", sort: "" };

const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
const MONTH_RE = "(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*";
const monthNo = (m: string) => String(MONTHS.indexOf(m.slice(0, 3).toLowerCase()) + 1).padStart(2, "0");
const pad2 = (n: string) => n.padStart(2, "0");

/** The latest date the site's own text gives (day, month or year), or null. A range such as "Feb 2025 to Oct 2026" reads as its end. Never guesses. */
export function dateIn(text: string): LedgerDate | null {
  const found: LedgerDate[] = [];
  for (const m of text.matchAll(new RegExp(`\\b(\\d{1,2}) ${MONTH_RE} (20\\d\\d)\\b`, "g"))) {
    found.push({ label: `${m[1]} ${m[2]} ${m[3]}`, sort: `${m[3]}-${monthNo(m[2])}-${pad2(m[1])}` });
  }
  for (const m of text.matchAll(new RegExp(`\\b${MONTH_RE} (\\d{1,2}), (20\\d\\d)\\b`, "g"))) {
    found.push({ label: `${m[2]} ${m[1]} ${m[3]}`, sort: `${m[3]}-${monthNo(m[1])}-${pad2(m[2])}` });
  }
  for (const m of text.matchAll(new RegExp(`\\b${MONTH_RE} (20\\d\\d)\\b`, "g"))) {
    found.push({ label: `${m[1]} ${m[2]}`, sort: `${m[2]}-${monthNo(m[1])}-00` });
  }
  for (const m of text.matchAll(/\b(20\d\d)\b/g)) found.push({ label: m[1], sort: `${m[1]}-00-00` });
  return found.reduce<LedgerDate | null>((best, d) => (!best || d.sort > best.sort ? d : best), null);
}

const GITHUB = "github.com";
const PUBLIC_MARK = "/ME/public/";

/** What a visitor can do with a raw `source` string: follow it if it is public, otherwise be told it is private. */
export function sourceOf(source: string): LedgerSource {
  if (/^https?:\/\//.test(source)) {
    const url = new URL(source);
    const host = url.hostname.replace(/^www\./, "");
    const repo = host === GITHUB ? url.pathname.split("/").filter(Boolean)[1] : undefined;
    const label = repo ? (url.pathname.includes("/commits/") ? `${repo} commit history` : `${repo} on GitHub`) : host;
    return { label, href: source, isPrivate: false };
  }
  if (source.endsWith(".tex")) return { label: "Résumé", href: profile.resumeHref, isPrivate: false };
  const i = source.indexOf(PUBLIC_MARK);
  if (i >= 0) return { label: source.includes("acharya-users") ? "Store analytics screenshot" : "Document scan", href: `/${source.slice(i + PUBLIC_MARK.length)}`, isPrivate: false };
  if (source.includes("claude-code-logs")) return { label: "Local Claude Code logs (private)", isPrivate: true };
  if (source.includes("play-console")) return { label: "Play Console (private)", isPrivate: true };
  if (source.endsWith(".csv")) return { label: "My notes (not linked)", isPrivate: true };
  if (source.startsWith("git log")) return { label: "Private repo, git history", isPrivate: true };
  return { label: "Private repo", isPrivate: true };
}

const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const HOME = (label: string, hash: string): LedgerLink => ({ label: `Home, ${label}`, href: `/#${hash}` });
const hasCase = (p: Project) => !p.compact;

/** Timeline entries (the About chapter) that print this exact figure. Short or bare numbers are too ambiguous to match. */
function inTimeline(value: string): boolean {
  if (value.length < 3) return false;
  const re = new RegExp(`(^|[^\\w.,])${escapeRe(value)}(?![\\w]|[.,]\\d)`);
  return timeline.some((t) => re.test(t.body));
}

function addLinks(into: LedgerLink[], ...links: LedgerLink[]) {
  for (const l of links) if (!into.some((x) => x.href === l.href)) into.push(l);
}

type Figure = { metric: Metric; slug?: string; where: LedgerLink[]; project?: Project };

/** Figures from Impact and from every case outcome, merged where the same number from the same source appears in both. */
function figureRows(): LedgerRow[] {
  const byKey = new Map<string, Figure>();
  const add = (metric: Metric, where: LedgerLink, project?: Project) => {
    const slug = metric.projectSlug ?? project?.slug;
    const key = `${slug ?? ""}|${metric.value}|${metric.source}`;
    const hit = byKey.get(key);
    if (hit) addLinks(hit.where, where);
    else byKey.set(key, { metric, slug, where: [where], project });
  };

  // The hero's three facts mirror HeroMeta: the first two metrics and the hackathon placing.
  const heroKeys = new Set([metrics[0], metrics[1], metrics.find((m) => m.projectSlug === "vct-scout")].filter((m): m is Metric => Boolean(m)));
  for (const m of metrics) {
    add(m, HOME("Impact", "impact"));
    if (heroKeys.has(m)) add(m, HOME("Hero", "hero"));
  }
  for (const p of projects) {
    p.outcomes.forEach((m, i) => {
      if (hasCase(p)) add(m, { label: `${p.name}, outcomes`, href: `/work/${p.slug}/#sec-outcomes` }, p);
      else add(m, { label: `${p.name}`, href: "/#work" }, p);
      if (p.featured && i === 0) add(m, HOME("Work", "work"), p);
    });
  }

  const rows: LedgerRow[] = [];
  for (const { metric: m, slug, where } of byKey.values()) {
    if (inTimeline(m.value)) addLinks(where, HOME("About", "origin"));
    // A lab project's figure is not printed on its row; it counts only if another block of the site prints it.
    const project = projects.find((p) => p.slug === slug);
    if (project && !hasCase(project) && !where.some((w) => w.href !== "/#work")) continue;
    const shown = where.filter((w) => !(project && !hasCase(project) && w.href === "/#work"));
    rows.push({
      id: slugify(`${slug ?? "site"}-${m.value}-${m.label}`),
      value: m.value,
      claim: m.label,
      definition: m.context,
      appears: shown,
      basis: basisOf(m),
      source: sourceOf(m.source),
      asOf: dateIn(`${m.label} ${m.context} ${m.asOf ?? ""}`) ?? (m.source.startsWith("git log") || /^https:\/\/github\.com/.test(m.source) ? REPO_READ : UNDATED),
      projects: slug ? [slug] : [],
    });
  }
  return rows;
}

const SELF_REPORTED: NoteStatus = "Self-reported";

/** Notes that carry a trust status ("Not measured", "Projected", "Tested"). A "Self-reported" note restates an outcome row, so it is skipped. */
function noteRows(): LedgerRow[] {
  const rows: LedgerRow[] = [];
  for (const p of projects.filter(hasCase)) {
    for (const note of p.notes ?? []) {
      if (!note.status || note.status === SELF_REPORTED || !note.text) continue;
      const link = note.links?.[0];
      const basis: Basis = link ? basisOf({ source: link.href }) : "self";
      rows.push({
        id: slugify(`${p.slug}-note-${note.label}`),
        value: note.status,
        claim: `${p.name}: ${note.label.toLowerCase()}`,
        definition: note.text,
        appears: [{ label: `${p.name}, production notes`, href: `/work/${p.slug}/#sec-notes` }],
        basis,
        source: link
          ? { label: link.label, href: link.href, isPrivate: false }
          : { label: note.status === "Measured, unpublished" ? "Unpublished results" : "Private repo", isPrivate: true },
        asOf: REPO_READ,
        projects: [p.slug],
      });
    }
  }
  return rows;
}

const KIND_MARK: Record<Recognition["kind"], string> = { award: "Award", press: "Press", talk: "Talk" };

/** A recognition belongs to a project when that project links the same page or prints the same evidence image. */
function projectsFor(r: Recognition): string[] {
  return projects
    .filter((p) => (r.href && p.links.some((l) => l.href === r.href)) || (r.image && p.outcomes.some((o) => o.source.includes(r.image!.src))))
    .map((p) => p.slug);
}

function recognitionBasis(r: Recognition): Basis {
  if (r.href) {
    const b = basisOf({ source: r.href });
    // basisOf reads an unknown public host as "repo"; a page on someone else's site is third party.
    return b === "repo" && !r.href.includes("github.com") ? "third-party" : b;
  }
  return r.image?.src.includes("governors-citation") ? "third-party" : "self";
}

/** A date in the note counts only when it falls in the recognition's own year: a note may mention when I joined, which is not when it was won. */
function recognitionDate(r: Recognition): LedgerDate {
  const inNote = dateIn(r.note ?? "");
  return inNote && inNote.sort.startsWith(r.year) ? inNote : { label: r.year, sort: `${r.year}-00-00` };
}

function recognitionRows(): LedgerRow[] {
  return recognition.map((r) => ({
    id: slugify(`recognition-${r.title}`),
    value: KIND_MARK[r.kind],
    claim: r.title,
    definition: [r.issuer, r.note].filter(Boolean).join(". ").replace(/\.\./g, "."),
    appears: [HOME("Proof", "proof")],
    basis: recognitionBasis(r),
    source: r.href ? sourceOf(r.href) : r.image ? { label: "Document scan", href: r.image.src, isPrivate: false } : { label: "Private", isPrivate: true },
    asOf: recognitionDate(r),
    projects: projectsFor(r),
  }));
}

/** Reads a figure out of the site's own prose. Throws, so the build fails, if the sentence no longer says it. */
function read(text: string, re: RegExp, what: string): string[] {
  const m = text.match(re);
  if (!m) throw new Error(`ledger: the site no longer states ${what}; update src/content/ledger.ts`);
  return m.slice(1);
}

/** The sentence of `text` that holds `fragment`, so a definition is the site's own wording. */
function sentenceWith(text: string, fragment: string): string {
  return text.split(/(?<=[.!?])\s+(?=[A-Z])/).find((s) => s.includes(fragment)) ?? text;
}

function profileRows(): LedgerRow[] {
  const resume = sourceOf(SRC.resume);
  const youtube = profile.links.find((l) => l.label === "YouTube");
  const past = profile.offDuty.find((o) => o.label === "Past life")?.value ?? "";
  const hackathon = recognition.find((r) => r.note?.includes("participants"));
  const [gpa, gpaDate] = read(profile.bio, /GPA (\d\.\d+), (\w+ \d{4})/, "the GPA");
  const [since] = read(profile.bio, /full-time since (\w+ \d{4})/, "the full-time start");
  const [videos, subs] = read(past, /(\d+) videos, about ([\d,]+) subscribers/, "the YouTube numbers");
  const [people] = read(hackathon?.note ?? "", /More than ([\d,]+) participants/, "the hackathon field size");
  const yt: LedgerSource = youtube ? { label: "YouTube channel", href: youtube.href, isPrivate: false } : { label: "Private", isPrivate: true };
  const about = [HOME("About", "origin")];
  const human = [HOME("Off duty", "human")];
  const self = { basis: "self" as Basis, projects: [] as string[] };
  return [
    { ...self, id: "profile-gpa", value: gpa, claim: "GPA, M.S. in Artificial Intelligence", definition: sentenceWith(profile.bio, "GPA"), appears: about, source: resume, asOf: dateIn(gpaDate) ?? UNDATED },
    { ...self, id: "profile-full-time", value: since, claim: "Full-time at the Burnes Center since", definition: sentenceWith(profile.bio, "full-time since"), appears: about, source: resume, asOf: dateIn(since) ?? UNDATED },
    { ...self, id: "profile-youtube", value: videos, claim: `Videos on my old YouTube channel, with about ${subs} subscribers`, definition: past, appears: human, source: yt, asOf: UNDATED },
    {
      id: "profile-hackathon-field",
      value: `${people}+`,
      claim: "Participants in the VALORANT Champions Tour Hackathon",
      definition: sentenceWith(hackathon?.note ?? "", "participants"),
      appears: [HOME("Proof", "proof")],
      basis: hackathon ? recognitionBasis(hackathon) : "self",
      projects: hackathon ? projectsFor(hackathon) : [],
      source: hackathon?.href ? sourceOf(hackathon.href) : resume,
      asOf: hackathon ? { label: hackathon.year, sort: `${hackathon.year}-00-00` } : UNDATED,
    },
  ];
}

export const ledger: LedgerRow[] = [...figureRows(), ...noteRows(), ...recognitionRows(), ...profileRows()];

/** Projects that have at least one row, in site order, plus their counts. The "site" bucket is every row with no project. */
export const ledgerProjects: { slug: string; name: string }[] = projects.filter((p) => ledger.some((r) => r.projects.includes(p.slug))).map((p) => ({ slug: p.slug, name: p.name }));
