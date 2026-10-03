import type { DirectorAction } from "@/lib/director/protocol";
import { metrics, profile, projects } from "@/content";
import { ART, type ArtId } from "./art";
import type { Intent, Match, ProjectHit } from "./match";

/**
 * The scripted cuts. Every line is written by hand from @/content: nothing here
 * is generated. Numbers are read from the content so they cannot drift, and
 * the director speaks about DB in the third person, as the live one does.
 */

export type Step = { say: string } | { act: DirectorAction };

/* ---------- content helpers ---------- */

const project = (slug: string) => projects.find((p) => p.slug === slug);
const has = (slug: string) => Boolean(project(slug));
const metric = (label: RegExp) => metrics.find((m) => label.test(m.label));
const offDuty = (label: string) => profile.offDuty.find((o) => o.label === label)?.value;

/** The headline numbers that point at a project, in the order the content ranks them. */
const proven = () => metrics.filter((m) => m.projectSlug && has(m.projectSlug));

const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);

/** Content is written by DB in the first person; the director narrates him in the third. */
export function thirdPerson(text: string): string {
  return text
    .replace(/\bI'm\b/g, "he is")
    .replace(/(^|[.:;!?]\s+)I\b/g, "$1He")
    .replace(/\bI\b/g, "he")
    .replace(/\bhe have\b/g, "he has")
    .replace(/\bhe am\b/g, "he is")
    .replace(/\bmy\b/g, "his")
    .replace(/\bMy\b/g, "His")
    .replace(/\bme\b/g, "him");
}

const OWNED_CAP = 150;

/** What DB personally owned on a project, as one spoken sentence. Empty when the content has none. */
function ownedLine(slug: string, brief = false): string {
  const owned = project(slug)?.owned?.trim();
  if (!owned) return "";
  const text = thirdPerson(owned);
  // Brief keeps the claim and drops the receipts; long ones lose everything after the first semicolon.
  const cutAt = brief ? text.search(/[:;]/) : text.length > OWNED_CAP ? text.indexOf(";") : -1;
  const clipped = cutAt > 0 ? text.slice(0, cutAt) : text;
  return clipped.endsWith(".") ? clipped : `${clipped}.`;
}

/** "1,000+ families using A-IEP." from a headline metric. */
function claim(m: { value: string; label: string }): string {
  return `${m.value} ${lowerFirst(thirdPerson(m.label))}.`;
}

/* ---------- step builders ---------- */

const say = (text: string): Step => ({ say: text });
const sayIf = (text: string): Step[] => (text.trim() ? [say(text)] : []);
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

const listOf = (items: string[]) =>
  items.length < 3 ? items.join(" and ") : `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** One project, introduced by the words in the request that led to it. */
function hitBeat(hit: ProjectHit): Step[] {
  const p = project(hit.slug);
  if (!p) return [];
  const why = hit.stack.length ? `${p.name} uses ${listOf(hit.stack.slice(0, 3))}.` : `${p.name} matches "${hit.words[0]}".`;
  return [...show(hit.slug), say(`${why} ${p.tagline}`)];
}

/** "You said React." followed by where it shows up, or nothing when no stack entry matched. */
function techBeat(match: Match): Step[] {
  const strong = match.tech.hits.filter((h) => h.stack.length);
  if (!strong.length) return [];
  const [first] = strong;
  return [
    say(`You mentioned ${listOf(match.tech.techWords.slice(0, 3))}.`),
    ...hitBeat(first),
    ...sayIf(ownedLine(first.slug)),
  ];
}

/** Nothing matched an intent, but the request named things the content knows about. */
function composed(match: Match): Step[] {
  const words = match.tech.words.slice(0, 3);
  return [
    say(`This is a scripted tour, so I read keywords. You said ${listOf(words)}. Here is where that shows up.`),
    ...match.tech.hits.flatMap(hitBeat),
    ...sayIf(match.tech.hits[0] ? ownedLine(match.tech.hits[0].slug) : ""),
    draw("lightbulb", "cut from your keywords"),
    say("The rest is one email away."),
    go("contact"),
    end,
  ];
}

/* ---------- the cuts ---------- */

function founder(): Step[] {
  const families = metric(/families/i);
  const daily = metric(/daily users/i);
  const tools = metric(/tools/i);
  return [
    say("A founder. The useful question is whether one engineer can ship it and keep it running."),
    ...show("a-iep"),
    say(
      `A-IEP, shipped end to end. ${families?.value ?? "1,000+"} families read their child's special-education plan in plain language, in four languages.`,
    ),
    ...sayIf(ownedLine("a-iep", true)),
    draw("bridge", "prototype to production"),
    ...show("acharya-erp"),
    say(
      `Before that, a Flutter app with ${daily?.value ?? "20,000+"} daily users. He owned it from design to deployment, and the store rating went from 1.2 to 4.5.`,
    ),
    ...show("arc-control-mcp"),
    say(`And a tool of his own: arc-control-mcp, an MCP server with ${tools?.value ?? "26"} tools, published on npm.`),
    go("contact"),
    say("If that is the engineer you need, the email is the large link."),
    end,
  ];
}

function hiring(match: Match): Step[] {
  const results = proven().slice(0, 3);
  const spend = metric(/spend/i);
  return [
    say(`Hiring. The short version is what ${profile.shortName} owned and what it measured.`),
    ...results.flatMap((m, i) => [
      ...show(m.projectSlug!),
      say(`${claim(m)}${/access/i.test(m.label) ? " That counts access, not daily use." : ""}`),
      ...(i < 2 ? sayIf(ownedLine(m.projectSlug!)) : []),
    ]),
    say("He audits his own work too. He found that A-IEP's only automated check was a schema check, and started a benchmark."),
    ...(spend ? [say(`${spend.value} ${lowerFirst(spend.label)}: ${thirdPerson(spend.context)}`)] : []),
    draw("chart", "results, with receipts"),
    ...techBeat(match),
    go("proof"),
    say("Awards and press are listed with their sources."),
    go("contact"),
    end,
  ];
}

function engineer(match: Match): Step[] {
  const rag = match.rag || match.tech.hits.some((h) => h.slug === "knowledge-agent-for-impact" && h.stack.length);
  return [
    say(rag ? "Retrieval and infrastructure. Two problems, one stack." : "The hardest problem is private data."),
    go("systems"),
    say("A-IEP: upload, OCR, redact, analyze, translate, on Step Functions."),
    draw("documents", "documents in, plain language out"),
    ...show("a-iep"),
    say("PII is redacted before the model sees a word, and the original upload is deleted. Any failure purges the unredacted artifacts."),
    ...(rag && has("knowledge-agent-for-impact")
      ? [
          ...show("knowledge-agent-for-impact"),
          say(
            "For RAG across agencies he set the technical direction on knowledge-agent-for-impact: OpenSearch Serverless, Lambda, DynamoDB and Cognito. The code was mostly a teammate's, so technical lead is the honest word.",
          ),
        ]
      : []),
    draw("stack", "infrastructure that stays up"),
    say("Then measurement. He found that A-IEP's only automated check was a schema check, and started a synthetic benchmark with a public RFC."),
    ...open("a-iep"),
    end,
  ];
}

function designer(): Step[] {
  return [
    say("A designer. Worth knowing the engineer holds the stylus too."),
    go("hero"),
    form("signal"),
    say("This page is one field of particles that rearranges itself per chapter."),
    draw("bezier", "a curve, handles showing"),
    say("The shapes you just watched are SVG, sampled into particles."),
    go("work"),
    end,
  ];
}

function student(): Step[] {
  return [
    say("A student. The path, briefly."),
    go("origin"),
    say("Bangalore: a B.E. in Computer Science, then a Flutter app for thousands of students."),
    draw("stairs", "one step at a time"),
    say("Then Boston: an M.S. in AI at Northeastern, GPA 3.83. Co-op from January 2024, full-time since July."),
    say("His own lesson from the Flutter app: if it breaks, a real person has a bad day."),
    go("contact"),
    end,
  ];
}

function gamer(): Step[] {
  return [
    say(`${offDuty("Games") ?? "Valorant and CS2"}.`),
    go("human"),
    form("crosshair"),
    hue("#ff4655"),
    draw("crosshair", "crosshair, head height"),
    say("It is also how VCT Scout came about: second place at the AWS and Riot Games hackathon."),
    ...show("vct-scout"),
    say("Ask in plain English, get a roster, built on 4,700+ match files."),
    end,
  ];
}

function food(): Step[] {
  return [
    say("Pani puri. A reasonable thing to draw."),
    hue("#ffa94d"),
    draw("paniPuri", "pani puri, mid-pour"),
    say(`${offDuty("Eats") ?? "Vegetarian. Pani puri is the favorite dish"}.`),
    go("human"),
    say(`${offDuty("Kitchen") ?? "Cooks Indian, Italian and Mexican"}.`),
    end,
  ];
}

function offDutyCut(): Step[] {
  const trip = offDuty("Favorite trip");
  return [
    say("Off duty. Black and purple, mostly."),
    go("human"),
    form("crosshair"),
    say(`${offDuty("Games") ?? "Valorant and CS2"}, and a plate of pani puri.`),
    draw("paniPuri", "pani puri, mid-pour"),
    ...sayIf(trip ? `Favorite trip: ${trip}.` : ""),
    end,
  ];
}

function intro(): Step[] {
  return [
    say(`${profile.shortName}, also known as DB.`),
    go("hero"),
    form("signal"),
    say(`${profile.title} at the Burnes Center, from ${profile.origin.split(",")[0]} to ${profile.location.split(",")[0]}.`),
    say(profile.oneLiner),
    go("origin"),
    say("It started with a Flutter app for thousands of students. It now ships to families and state agencies."),
    end,
  ];
}

/** The short tour: used for "surprise me" and when nothing at all matched. */
function shortTour(opening: string): Step[] {
  const [a, b] = proven();
  return [
    say(opening),
    go("origin"),
    say("Bangalore to Boston."),
    go("systems"),
    say("A pipeline that treats private data as a design input."),
    draw("signal", "noise, resolving into signal"),
    go("impact"),
    ...(a && b ? [say(`${claim(a)} ${claim(b)}`)] : []),
    go("proof"),
    say("Sources are on the page."),
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
      return [say("The email is the large link. The resume is beside it."), go("contact"), end];
    case "surprise":
      return shortTour("No brief. A short tour, then.");
    default:
      return match.tech.hits.length
        ? composed(match)
        : shortTour("This is a scripted tour: it matches keywords, and none of yours matched. Here is the short version.");
  }
}
