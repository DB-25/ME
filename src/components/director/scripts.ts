import type { DirectorAction } from "@/lib/director/protocol";
import { metrics, projects, type Metric } from "@/content";
import { LINE, OWNED_LINE, PROJECT_INTRO, metricLine, type VoiceLine } from "@/lib/director/voice-library";
import { ART, type ArtId } from "./art";
import type { Intent, Match } from "./match";

/**
 * The scripted cuts. Nothing here is generated, and no sentence is written here:
 * every spoken line is one of DB's recorded lines in the voice library
 * (@/lib/director/voice-library), referenced by name, so the script, the captions
 * and the recordings cannot drift apart. The cuts only decide order and actions.
 */

export type Step = { say: string } | { act: DirectorAction };

/* ---------- content helpers ---------- */

const project = (slug: string) => projects.find((p) => p.slug === slug);
const has = (slug: string) => Boolean(project(slug));

/** The headline numbers that point at a project, in the order the content ranks them. */
const proven = () => metrics.filter((m) => m.projectSlug && has(m.projectSlug));

/** The headline figure that belongs to a project, if the Impact chapter has one. */
const metricOf = (slug: string): Metric | undefined => metrics.find((m) => m.projectSlug === slug);

/* ---------- step builders ---------- */

const say = (line: VoiceLine | string): Step => ({ say: typeof line === "string" ? line : line.text });
const sayAll = (...lines: Array<VoiceLine | undefined>): Step[] => lines.filter((l): l is VoiceLine => Boolean(l)).map(say);
const go = (chapter: Extract<DirectorAction, { name: "goto_chapter" }>["args"]["chapter"]): Step => ({
  act: { name: "goto_chapter", args: { chapter } },
});
const show = (slug: string): Step[] => (has(slug) ? [{ act: { name: "show_project", args: { slug } } }] : []);
/**
 * Scroll to a project's headline figure and light it up, then say the lines: `lead` (an introduction), the figure's
 * own sentence, then `after` (a caveat). The figure is lit before any of it is said. Nothing if the content has none.
 */
const figure = (slug: string, { lead, after = [] }: { lead?: VoiceLine; after?: VoiceLine[] } = {}): Step[] => {
  const m = metricOf(slug);
  if (!m) return [];
  return [{ act: { name: "show_metric", args: { label: m.label } } }, ...(lead ? [say(lead)] : []), say(metricLine(m)), ...after.map(say)];
};
/** The case study is the last thing a tour does: it opens once the lines have been said. */
const caseStudy = (slug: string): Step[] => (project(slug) && !project(slug)?.compact ? [{ act: { name: "open_case_study", args: { slug } } }] : []);
const draw = (art: ArtId, label: string): Step => ({ act: { name: "draw", args: { svg: ART[art], label } } });
const hue = (hex: string | null): Step => ({ act: { name: "set_hue", args: { hex } } });
const form = (formation: Extract<DirectorAction, { name: "form" }>["args"]["formation"]): Step => ({
  act: { name: "form", args: { formation } },
});
const end: Step = { act: { name: "end_scene", args: {} } };

/* ---------- keyword composition ---------- */

/*
 * What the visitor typed shows up in the HUD log and in which projects are chosen,
 * never inside a narrated sentence, so every spoken line has a recording.
 */

/** One project, introduced by what it is. */
function projectBeat(slug: string): Step[] {
  return [...show(slug), ...sayAll(PROJECT_INTRO[slug])];
}

/** A project the request pointed at, with what I owned on it. Nothing when no technology matched. */
function techBeat(match: Match): Step[] {
  const first = match.tech.hits.find((h) => h.stack.length);
  if (!first) return [];
  return [...sayAll(LINE.techPoint), ...projectBeat(first.slug), ...sayAll(OWNED_LINE[first.slug])];
}

/** Nothing matched an intent, but the request named things the content knows about. */
function composed(match: Match): Step[] {
  const first = match.tech.hits[0];
  return [
    say(LINE.composedOpen),
    ...match.tech.hits.flatMap((h) => projectBeat(h.slug)),
    ...sayAll(first && OWNED_LINE[first.slug]),
    go("contact"),
    say(LINE.composedClose),
    end,
  ];
}

/* ---------- the cuts ---------- */

/*
 * Each cut is a 35 to 50 second walk with one rule: the page moves to the thing, lights it, and only then
 * says the sentence about it. Every beat is one move and one short line, with no drawing in between.
 * The persona cuts open on the strongest evidence for that visitor and end on a next step: Contact, or
 * the case study that holds the receipts. They say what the live Director says (same figures, same
 * caveats), so the offline tour is the same person, only without the model.
 */

/** Founder: ownership and production (A-IEP), scale in the field (Acharya), solo speed (Course Delivery), then the ask. */
function founder(): Step[] {
  return [
    say(LINE.founderOpen),
    ...show("a-iep"),
    say(LINE.founderAiepOwned),
    ...figure("a-iep"),
    ...figure("acharya-erp", { lead: LINE.founderAcharyaIntro }),
    ...show("course-delivery"),
    say(LINE.founderCourse),
    go("contact"),
    say(LINE.founderClose),
    end,
  ];
}

/** Hiring manager: what I owned and how far it reached, with the caveat that goes with each number. */
function hiring(match: Match): Step[] {
  return [
    say(LINE.hiringOpen),
    ...show("a-iep"),
    say(LINE.hiringAiep),
    ...figure("a-iep"),
    ...show("genie"),
    say(LINE.hiringSmartModel),
    ...figure("genie", { after: [LINE.accessCaveat] }),
    say(LINE.hiringAuditResult),
    ...techBeat(match),
    go("contact"),
    say(LINE.hiringClose),
    end,
  ];
}

/** Engineer: the architecture, the privacy pipeline, how I measure it, a tool of my own, and the case study. */
function engineer(match: Match): Step[] {
  const rag = match.rag || match.tech.hits.some((h) => h.slug === "knowledge-agent-for-impact" && h.stack.length);
  return [
    say(rag ? LINE.engineerRagOpen : LINE.engineerOpen),
    ...show("a-iep"),
    say(LINE.engineerPipeline),
    say(LINE.engineerPrivacy),
    ...(rag && has("knowledge-agent-for-impact")
      ? [
          ...show("knowledge-agent-for-impact"),
          ...sayAll(LINE.engineerRag, LINE.engineerRagStack, LINE.engineerRagHonest),
        ]
      : []),
    say(LINE.engineerEvals),
    ...show("arc-control-mcp"),
    say(LINE.engineerArc),
    ...show("a-iep"),
    say(LINE.engineerCaseStudy),
    ...caseStudy("a-iep"),
    end,
  ];
}

function designer(): Step[] {
  return [
    say(LINE.designerOpen),
    go("hero"),
    form("signal"),
    say(LINE.designerField),
    draw("bezier", "a curve, handles showing"),
    say(LINE.designerSvg),
    go("contact"),
    say(LINE.designerClose),
    end,
  ];
}

function student(): Step[] {
  return [
    say(LINE.studentOpen),
    go("origin"),
    say(LINE.studentBangalore),
    ...sayAll(LINE.studentBoston, LINE.studentCoop, LINE.studentLesson),
    go("contact"),
    say(LINE.closeEmail),
    end,
  ];
}

function gamer(): Step[] {
  return [
    say(LINE.gamerOpen),
    go("human"),
    hue("#ff4655"),
    draw("crosshair", "crosshair, head height"),
    ...show("vct-scout"),
    say(LINE.gamerVct),
    say(LINE.gamerScout),
    say(LINE.gamerCaseStudy),
    ...caseStudy("vct-scout"),
    end,
  ];
}

function food(): Step[] {
  return [
    say(LINE.foodOpen),
    hue("#ffa94d"),
    draw("paniPuri", "pani puri, mid-pour"),
    say(LINE.foodVegetarian),
    go("human"),
    say(LINE.foodKitchen),
    go("contact"),
    say(LINE.closeEmail),
    end,
  ];
}

function offDutyCut(): Step[] {
  return [
    say(LINE.offDutyOpen),
    go("human"),
    say(LINE.offDutyGames),
    draw("paniPuri", "pani puri, mid-pour"),
    say(LINE.offDutyTrip),
    go("contact"),
    say(LINE.closeEmail),
    end,
  ];
}

/** Who I am, in three beats, with two numbers to prove it. */
function intro(): Step[] {
  return [
    say(LINE.introName),
    go("hero"),
    say(LINE.introRole),
    say(LINE.introOneLiner),
    ...figure("a-iep"),
    ...figure("genie", { after: [LINE.accessCaveat] }),
    go("contact"),
    say(LINE.closeEmail),
    end,
  ];
}

/** The short tour: used for "surprise me" and when nothing at all matched. Two numbers, then the ask. */
function shortTour(opening: VoiceLine): Step[] {
  const [a, b] = proven();
  return [
    say(opening),
    go("origin"),
    say(LINE.tourBangalore),
    go("systems"),
    say(LINE.tourPipeline),
    ...(a ? [{ act: { name: "show_metric", args: { label: a.label } } } as Step, say(metricLine(a))] : []),
    ...(b ? [{ act: { name: "show_metric", args: { label: b.label } } } as Step, say(metricLine(b))] : []),
    go("contact"),
    say(LINE.closeEmail),
    end,
  ];
}

export function buildScript(match: Match): Step[] {
  const intent: Intent | null = match.intent;
  switch (intent) {
    case "founder":
      return founder();
    case "hiring":
      return hiring(match);
    case "engineer":
      return engineer(match);
    case "designer":
      return designer();
    case "student":
      return student();
    case "gamer":
      return gamer();
    case "food":
      return food();
    case "offduty":
      return offDutyCut();
    case "intro":
      return intro();
    case "contact":
      return [go("contact"), say(LINE.contactLine), end];
    case "surprise":
      return shortTour(LINE.surpriseOpen);
    default:
      return match.tech.hits.length ? composed(match) : shortTour(LINE.noMatchOpen);
  }
}
