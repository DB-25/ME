import type { DirectorAction } from "@/lib/director/protocol";
import { metrics, projects } from "@/content";
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

/* ---------- step builders ---------- */

const say = (line: VoiceLine | string): Step => ({ say: typeof line === "string" ? line : line.text });
const sayAll = (...lines: Array<VoiceLine | undefined>): Step[] => lines.filter((l): l is VoiceLine => Boolean(l)).map(say);
const go = (chapter: Extract<DirectorAction, { name: "goto_chapter" }>["args"]["chapter"]): Step => ({
  act: { name: "goto_chapter", args: { chapter } },
});
const show = (slug: string): Step[] => (has(slug) ? [{ act: { name: "show_project", args: { slug } } }] : []);
const open = (slug: string): Step[] => (has(slug) ? [{ act: { name: "open_case_study", args: { slug } } }] : []);
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
    draw("lightbulb", "cut from your keywords"),
    say(LINE.composedClose),
    go("contact"),
    end,
  ];
}

/* ---------- the cuts ---------- */

function founder(): Step[] {
  return [
    say(LINE.founderOpen),
    ...show("a-iep"),
    say(LINE.founderAiep),
    ...sayAll(OWNED_LINE["a-iep"]),
    draw("bridge", "prototype to production"),
    ...show("acharya-erp"),
    say(LINE.founderAcharya),
    say(LINE.acharyaRating),
    ...show("arc-control-mcp"),
    say(LINE.founderArc),
    go("contact"),
    say(LINE.founderClose),
    end,
  ];
}

function hiring(match: Match): Step[] {
  const results = proven().slice(0, 3);
  const spend = metrics.find((m) => /spend/i.test(m.label));
  return [
    say(LINE.hiringOpen),
    ...results.flatMap((m, i) => [
      ...show(m.projectSlug!),
      say(metricLine(m)),
      ...(/access/i.test(m.label) ? [say(LINE.accessCaveat)] : []),
      ...(i < 2 ? sayAll(OWNED_LINE[m.projectSlug!]) : []),
    ]),
    ...sayAll(LINE.hiringAudit, LINE.hiringAuditDetail),
    ...(spend ? [say(metricLine(spend))] : []),
    draw("chart", "results, with receipts"),
    ...techBeat(match),
    go("proof"),
    say(LINE.hiringProof),
    go("contact"),
    end,
  ];
}

function engineer(match: Match): Step[] {
  const rag = match.rag || match.tech.hits.some((h) => h.slug === "knowledge-agent-for-impact" && h.stack.length);
  return [
    say(rag ? LINE.engineerRagOpen : LINE.engineerOpen),
    go("systems"),
    say(LINE.engineerPipeline),
    draw("documents", "documents in, plain language out"),
    ...show("a-iep"),
    ...sayAll(LINE.engineerPii, LINE.engineerPurge),
    ...(rag && has("knowledge-agent-for-impact")
      ? [
          ...show("knowledge-agent-for-impact"),
          ...sayAll(LINE.engineerRag, LINE.engineerRagStack, LINE.engineerRagHonest),
        ]
      : []),
    draw("stack", "infrastructure that stays up"),
    ...sayAll(LINE.engineerMeasure, LINE.engineerBenchmark),
    ...open("a-iep"),
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
    go("work"),
    end,
  ];
}

function student(): Step[] {
  return [
    say(LINE.studentOpen),
    go("origin"),
    say(LINE.studentBangalore),
    draw("stairs", "one step at a time"),
    ...sayAll(LINE.studentBoston, LINE.studentCoop, LINE.studentLesson),
    go("contact"),
    end,
  ];
}

function gamer(): Step[] {
  return [
    say(LINE.gamerOpen),
    go("human"),
    form("crosshair"),
    hue("#ff4655"),
    draw("crosshair", "crosshair, head height"),
    say(LINE.gamerVct),
    ...show("vct-scout"),
    say(LINE.gamerScout),
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
    end,
  ];
}

function offDutyCut(): Step[] {
  return [
    say(LINE.offDutyOpen),
    go("human"),
    form("crosshair"),
    say(LINE.offDutyGames),
    draw("paniPuri", "pani puri, mid-pour"),
    say(LINE.offDutyTrip),
    end,
  ];
}

function intro(): Step[] {
  return [
    say(LINE.introName),
    go("hero"),
    form("signal"),
    say(LINE.introRole),
    say(LINE.introOneLiner),
    go("origin"),
    say(LINE.introStart),
    end,
  ];
}

/** The short tour: used for "surprise me" and when nothing at all matched. */
function shortTour(opening: VoiceLine): Step[] {
  const [a, b] = proven();
  return [
    say(opening),
    go("origin"),
    say(LINE.tourBangalore),
    go("systems"),
    say(LINE.tourPipeline),
    draw("signal", "noise, resolving into signal"),
    go("impact"),
    ...(a && b ? [say(metricLine(a)), say(metricLine(b))] : []),
    go("proof"),
    say(LINE.tourSources),
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
      return [say(LINE.contactLine), go("contact"), end];
    case "surprise":
      return shortTour(LINE.surpriseOpen);
    default:
      return match.tech.hits.length ? composed(match) : shortTour(LINE.noMatchOpen);
  }
}
