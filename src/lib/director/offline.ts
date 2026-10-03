import type { DirectorEvent } from "@/lib/director/protocol";
import { matchIntent, type Match } from "@/components/director/match";
import { lineAudio } from "@/components/director/lineAudio";
import { buildScript } from "@/components/director/scripts";
import { projects } from "@/content";

/**
 * The scripted tour: deterministic cuts that emit the same DirectorEvent
 * stream as the live worker. Nothing here is generated; the scripts are
 * written by hand from @/content (see components/director/scripts.ts) and the
 * request is routed by a keyword matcher (components/director/match.ts). The
 * UI says so.
 */

const nameOf = (slug: string) => projects.find((p) => p.slug === slug)?.name ?? slug;

/** One line for the HUD log: what the matcher made of the request. */
export function explainMatch(prompt: string): string {
  const match: Match = matchIntent(prompt);
  if (match.intent) return `scripted tour: read as ${match.intent}`;
  if (match.tech.hits.length) {
    return `scripted tour: matched ${match.tech.words.slice(0, 3).join(", ")} to ${match.tech.hits.map((h) => nameOf(h.slug)).join(", ")}`;
  }
  return "scripted tour: no keyword matched";
}

/**
 * Each narration line is sent whole, ended by a newline: the Narrator plays a
 * line's recording (or times its caption) as one unit. While a step plays, the
 * next spoken line is already being fetched.
 */
export async function* offlineDirector(prompt: string, signal: AbortSignal): AsyncGenerator<DirectorEvent> {
  const steps = buildScript(matchIntent(prompt));
  const nextLine = (from: number) => {
    for (let i = from; i < steps.length; i++) {
      const step = steps[i];
      if ("say" in step && step.say.trim()) return step.say;
    }
    return null;
  };

  const first = nextLine(0);
  if (first) lineAudio.preload(first);
  for (const [i, step] of steps.entries()) {
    if (signal.aborted) return;
    const ahead = nextLine(i + 1);
    if (ahead) lineAudio.preload(ahead);
    if ("say" in step) {
      if (step.say.trim()) yield { type: "text", delta: `${step.say}\n` };
    } else {
      yield { type: "action", action: step.act };
    }
  }
  yield { type: "done" };
}
