import type { DirectorEvent, DirectorMessage, DirectorRequest } from "@/lib/director/protocol";

/** Inlined at build time. Unset means there is no backend, so the site runs its offline cut. */
const DIRECTOR_URL = process.env.NEXT_PUBLIC_DIRECTOR_URL;

export const MEMORY_LIMIT = 6;
const CONNECT_TIMEOUT_MS = 12_000;
const IDLE_TIMEOUT_MS = 25_000;

const ACTION_NAMES = new Set([
  "goto_chapter",
  "show_project",
  "open_case_study",
  "draw",
  "form",
  "set_hue",
  "end_scene",
]);

/** The live director could not be reached or died mid-stream. Callers fall back to offline mode. */
export class DirectorUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectorUnavailableError";
  }
}

export function isDirectorConfigured(): boolean {
  return Boolean(DIRECTOR_URL);
}

/** Returns a new history capped at the last MEMORY_LIMIT messages. */
export function remember(history: DirectorMessage[], ...added: DirectorMessage[]): DirectorMessage[] {
  return [...history, ...added].slice(-MEMORY_LIMIT);
}

function parseEvent(line: string): DirectorEvent | null {
  let raw: unknown;
  try {
    raw = JSON.parse(line);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;
  const e = raw as { type?: unknown; delta?: unknown; message?: unknown; action?: { name?: unknown } };
  if (e.type === "text" && typeof e.delta === "string") return raw as DirectorEvent;
  if (e.type === "done") return { type: "done" };
  if (e.type === "error") return { type: "error", message: typeof e.message === "string" ? e.message : "director error" };
  if (e.type === "action" && e.action && typeof e.action.name === "string" && ACTION_NAMES.has(e.action.name)) {
    return raw as DirectorEvent;
  }
  return null;
}

/**
 * Stream DirectorEvents from the worker (NDJSON over POST).
 * Tolerates partial lines and several events per chunk. Throws
 * DirectorUnavailableError when the backend is missing, refuses (429/503),
 * times out, or ends without a single event.
 */
export async function* streamDirector(
  messages: DirectorMessage[],
  signal: AbortSignal,
): AsyncGenerator<DirectorEvent> {
  if (!DIRECTOR_URL) throw new DirectorUnavailableError("NEXT_PUBLIC_DIRECTOR_URL is not set");

  const ctrl = new AbortController();
  const onAbort = () => ctrl.abort();
  if (signal.aborted) return;
  signal.addEventListener("abort", onAbort, { once: true });

  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const arm = (ms: number) => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      timedOut = true;
      ctrl.abort();
    }, ms);
  };

  try {
    const body: DirectorRequest = { messages: messages.slice(-MEMORY_LIMIT) };
    arm(CONNECT_TIMEOUT_MS);
    const res = await fetch(DIRECTOR_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok || !res.body) throw new DirectorUnavailableError(`director responded ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let seen = 0;
    let finished = false;

    while (!finished) {
      arm(IDLE_TIMEOUT_MS);
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      const lines = buffer.split("\n");
      buffer = done ? "" : (lines.pop() ?? "");
      if (done && lines.length && !lines[lines.length - 1].trim()) lines.pop();

      for (const line of lines) {
        if (!line.trim()) continue;
        const event = parseEvent(line);
        if (!event) continue;
        seen += 1;
        yield event;
        if (event.type === "done") finished = true;
      }
      if (done) break;
    }

    if (seen === 0) throw new DirectorUnavailableError("director sent no events");
    if (!finished) yield { type: "done" };
  } catch (err) {
    if (signal.aborted) return;
    if (err instanceof DirectorUnavailableError) throw err;
    const reason = timedOut ? "director timed out" : err instanceof Error ? err.message : "director failed";
    throw new DirectorUnavailableError(reason);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener("abort", onAbort);
    ctrl.abort();
  }
}
