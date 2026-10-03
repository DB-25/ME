import type { DirectorAction, DirectorEvent } from "@/lib/director/protocol";
import { ART, type ArtId } from "@/components/director/art";
import { metrics, profile, projects } from "@/content";

/**
 * The offline cut: deterministic, scripted takes that emit the same
 * DirectorEvent stream as the live worker. Nothing here is generated; every
 * line is written by hand from @/content. The UI labels it as such.
 */

type Step = { say: string } | { act: DirectorAction };
type Intent =
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

const WORD_MS = 22;

/* ---------- matching ---------- */

const MATCHERS: Array<[Intent, RegExp]> = [
  ["food", /pani\s*puri|golgappa|puchka|\bfood|hungry|\bcook|\beat\b|snack|recipe|dinner|lunch/i],
  ["gamer", /valorant|\bcs2?\b|counter.?strike|gamer|gaming|\bgames?\b|fps|esports?|fortnite|\baim\b/i],
  ["designer", /design(er)?\b|\bux\b|\bui\b|typograph|creative|art director|brand/i],
  ["founder", /founder|co-?founder|start-?up|my company|my startup|bootstrap|\bvc\b|investor/i],
  ["student", /student|intern(ship)?\b|learn|mentor|career|bootcamp|university|beginner|junior|advice/i],
  ["hiring", /\bhir(e|ing)\b|recruit|\bjob\b|\brole\b|candidate|resume|position|opening|interview|talent/i],
  ["engineer", /infra|infrastructure|engineer|backend|devops|cloud|\baws\b|architect|\brag\b|platform|hardest|scale|technical|systems?|pipeline/i],
  ["offduty", /\bfun\b|hobb(y|ies)|off.?duty|personal|human|outside work|weekend/i],
  ["contact", /contact|e-?mail|reach|get in touch|talk to|connect/i],
  ["intro", /who (is|are)|introduce|about (him|you|db|dhruv|yourself)|tell me about|\bdb\b|dhruv|meet/i],
];

export function matchIntent(prompt: string): { intent: Intent; matched: boolean; infra: boolean } {
  const infra = /infra|infrastructure|backend|devops|cloud|\baws\b|architect|systems?|pipeline|hardest/i.test(prompt);
  if (/surprise/i.test(prompt)) return { intent: "surprise", matched: true, infra };
  const hit = MATCHERS.find(([, re]) => re.test(prompt));
  return hit ? { intent: hit[0], matched: true, infra } : { intent: "surprise", matched: false, infra };
}

/* ---------- content helpers ---------- */

const has = (slug: string) => projects.some((p) => p.slug === slug);
const name = (slug: string) => projects.find((p) => p.slug === slug)?.name ?? slug;
const metric = (label: RegExp) => metrics.find((m) => label.test(m.label))?.value;
const offDuty = (label: string) => profile.offDuty.find((o) => o.label === label)?.value;

const say = (text: string): Step => ({ say: text });
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

/* ---------- scripts ---------- */

function script(intent: Intent, matched: boolean, infra: boolean): Step[] {
  const sandbox = metric(/state employees/i) ?? "44,000+";
  const languages = metric(/languages/i) ?? "4";
  const acharya = metric(/first big app/i) ?? "15,000+";

  switch (intent) {
    case "hiring":
      return [
        say(`Hiring. The short version. ${profile.name}, ${profile.title}.`),
        go("hero"),
        say("Mobile engineer in Bangalore, then an M.S. in AI at Northeastern. Now lead AI engineer on A-IEP."),
        ...show("a-iep"),
        say(`It rewrites special-education plans for parents, in ${languages} languages. It is live.`),
        ...(infra
          ? [go("systems"), say("You mentioned infra. Upload, redact, analyze, translate, and a failure path that purges what it must.")]
          : []),
        draw("handshake", "a handshake"),
        say("A Governor's Citation, second place at an AWS and Riot Games hackathon, two NASPO awards as part of the team."),
        go("proof"),
        say("The email is at the bottom."),
        go("contact"),
        end,
      ];

    case "founder":
      return [
        say("A founder. The useful question is whether he can ship a first version and keep it running."),
        ...show("acharya-erp"),
        say(`His first app: Flutter, ${acharya} users, rating from 1.2 to 4.5. Design to deployment, then he trained interns to take it over.`),
        draw("lightbulb", "an idea, shipped"),
        ...show("public-voice"),
        say("Lately, a voice survey that asks one follow-up and lets you go. No login."),
        go("impact"),
        say("Numbers, with sources."),
        go("contact"),
        end,
      ];

    case "engineer":
      return [
        say("The hardest problem is private data."),
        go("systems"),
        say("A-IEP: upload, OCR, redact, analyze, translate, on Step Functions."),
        draw("documents", "documents in, plain language out"),
        ...show("a-iep"),
        say("PII is redacted before the model sees a word, and the original upload is deleted. Any failure purges the unredacted artifacts."),
        draw("bridge", "prototype to production"),
        say("The next problem is measurement: a synthetic benchmark of 50 students who do not exist."),
        ...open("a-iep"),
        end,
      ];

    case "designer":
      return [
        say("A designer. Worth knowing the engineer holds the stylus too."),
        go("hero"),
        form("monogram"),
        say("This page is one field of particles that rearranges itself per chapter."),
        draw("bezier", "a curve, handles showing"),
        say("The shapes you just watched are SVG, sampled into particles."),
        go("work"),
        end,
      ];

    case "student":
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

    case "gamer":
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

    case "food":
      return [
        say("Pani puri. A reasonable thing to draw."),
        hue("#ffa94d"),
        draw("paniPuri", "a bowl of pani puri"),
        say(`${offDuty("Eats") ?? "Vegetarian. Pani puri is the favorite dish"}.`),
        go("human"),
        say(`${offDuty("Kitchen") ?? "Cooks Indian, Italian and Mexican"}.`),
        end,
      ];

    case "offduty":
      return [
        say("Off duty. Black and purple, mostly."),
        go("human"),
        form("crosshair"),
        say(`${offDuty("Games") ?? "Valorant and CS2"}, and a bowl of pani puri.`),
        draw("paniPuri", "a bowl of pani puri"),
        say(offDuty("Favorite trip") ? `Favorite trip: ${offDuty("Favorite trip")}.` : ""),
        end,
      ];

    case "intro":
      return [
        say(`${profile.shortName}, also known as DB.`),
        go("hero"),
        form("portrait"),
        say(`${profile.title} at the Burnes Center, from ${profile.origin.split(",")[0]} to ${profile.location.split(",")[0]}.`),
        say(profile.oneLiner),
        go("origin"),
        say("It started with a Flutter app for thousands of students. It now ships to families and state agencies."),
        end,
      ];

    case "contact":
      return [say("The email is the large link. The resume is beside it."), go("contact"), end];

    default:
      return [
        say(
          matched
            ? "No brief. A short tour, then."
            : "Offline, I match keywords rather than sentences. Here is the short version.",
        ),
        go("origin"),
        say("Bangalore to Boston."),
        go("systems"),
        say("A pipeline that treats private data as a design input."),
        draw("signal", "a signal"),
        go("impact"),
        say(`${metric(/AI tools/i) ?? "26"} AI tools for government and civic partners, and ${sandbox} state employees with sandbox access.`),
        go("proof"),
        say("Sources are on the page."),
        end,
      ];
  }
}

/* ---------- stream ---------- */

const sleep = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => (clearTimeout(timer), resolve()), { once: true });
  });

/**
 * Emit a line word by word on the wall clock. The count is derived from
 * elapsed time, so a throttled background tab catches up in one step.
 */
async function* speak(text: string, signal: AbortSignal): AsyncGenerator<DirectorEvent> {
  const words = text.split(/\s+/).filter(Boolean);
  const start = performance.now();
  let sent = 0;
  while (sent < words.length && !signal.aborted) {
    const due = Math.min(words.length, Math.floor((performance.now() - start) / WORD_MS) + 1);
    if (due > sent) {
      yield { type: "text", delta: words.slice(sent, due).join(" ") + " " };
      sent = due;
    }
    if (sent < words.length) await sleep(WORD_MS, signal);
  }
}

export async function* offlineDirector(prompt: string, signal: AbortSignal): AsyncGenerator<DirectorEvent> {
  const { intent, matched, infra } = matchIntent(prompt);
  for (const step of script(intent, matched, infra)) {
    if (signal.aborted) return;
    if ("say" in step) {
      if (step.say.trim()) yield* speak(step.say, signal);
    } else {
      yield { type: "action", action: step.act };
    }
  }
  yield { type: "done" };
}
