import type { DirectorEvent } from "@/lib/director/protocol";
import { matchIntent, type Match } from "@/components/director/match";
import { buildScript } from "@/components/director/scripts";
import { projects } from "@/content";

/**
 * The scripted tour: deterministic cuts that emit the same DirectorEvent
 * stream as the live worker. Nothing here is generated; the scripts are
 * written by hand from @/content (see components/director/scripts.ts) and the
 * request is routed by a keyword matcher (components/director/match.ts). The
 * UI says so.
 */

const WORD_MS = 22;

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
  for (const step of buildScript(matchIntent(prompt))) {
    if (signal.aborted) return;
    if ("say" in step) {
      if (step.say.trim()) yield* speak(step.say, signal);
    } else {
      yield { type: "action", action: step.act };
    }
  }
  yield { type: "done" };
}
