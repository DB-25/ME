import { toAction } from "./actions";
import { evidenceFor, shownKey } from "./evidence";
import type { DirectorAction, DirectorEvent, DirectorMessage } from "./protocol";
import { SYSTEM_PROMPT } from "./prompt";
import { TOOLS } from "./tools";

export type OpenAIConfig = { apiKey: string; model: string; reasoningEffort: string };

const OPENAI_URL = "https://api.openai.com/v1/responses";
/** Visual actions per turn, end_scene included. speak calls have their own cap. */
const MAX_ACTIONS = 6;
const MAX_SPEAKS = 2;
/** Whole-call ceiling, headers and streamed body included. A stall past it ends the stream with an error. */
const UPSTREAM_TIMEOUT_MS = 30_000;
/** About 120 words: a real answer is 45 to 90. Anything past this is cut off mid-turn. */
const MAX_NARRATION_CHARS = 900;
/** The answer in words, up to five visual tool calls and a couple of short speak calls. Reasoning tokens count too. */
const MAX_OUTPUT_TOKENS = 2000;
/** A turn with fewer words than this has no answer: it is repaired (see directorEvents). */
export const MIN_ANSWER_WORDS = 8;
const MIN_TEXT_CHARS_BEFORE_ACTIONS = 24;
/** What survives of a turn that had to be repaired: the evidence it pointed at, never the decoration. */
const KEEP_ON_REPAIR = new Set(["show_project", "show_metric", "goto_chapter", "open_case_study"]);
const REPAIR_NUDGE =
  "Your last turn contained no written answer. Answer the visitor's last message now, in words only: 2 to 4 sentences, first person, as DB, using only the KNOWLEDGE. Do not call any tool.";

const wordCount = (text: string) => text.trim().split(/\s+/).filter(Boolean).length;

/**
 * Open the streaming Responses API call. Returns null on any upstream failure
 * (logged server side) so the caller can answer 502 and the client goes offline.
 * `answerOnly` makes the call a text-only repair: tools stay declared (the prompt prefix stays
 * cacheable) but cannot be called.
 */
export async function openUpstream(
  config: OpenAIConfig,
  messages: DirectorMessage[],
  options: { answerOnly?: boolean } = {},
): Promise<Response | null> {
  const input: { role: string; content: string }[] = messages.map((m) => ({ role: m.role, content: m.content }));
  if (options.answerOnly) input.push({ role: "developer", content: REPAIR_NUDGE });
  const body: Record<string, unknown> = {
    model: config.model,
    instructions: SYSTEM_PROMPT,
    input,
    tools: TOOLS,
    tool_choice: options.answerOnly ? "none" : "auto",
    parallel_tool_calls: true,
    max_output_tokens: MAX_OUTPUT_TOKENS,
    store: false,
    stream: true,
  };
  if (config.reasoningEffort) body.reasoning = { effort: config.reasoningEffort };

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });
    if (!res.ok || !res.body) {
      console.error("openai upstream error", res.status, (await res.text()).slice(0, 500));
      return null;
    }
    return res;
  } catch (err) {
    console.error("openai fetch failed", err);
    return null;
  }
}

type SseEvent = {
  type?: string;
  delta?: string;
  item?: { type?: string; name?: string; arguments?: string };
  response?: { status?: string; incomplete_details?: { reason?: string }; error?: { message?: string } };
  message?: string;
};

/** Parse an OpenAI SSE body into its JSON events, in order. */
async function* sseEvents(upstream: Response): AsyncGenerator<SseEvent> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  const parse = (block: string): SseEvent | null => {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return null;
    try {
      return JSON.parse(data) as SseEvent;
    } catch {
      console.warn("unparseable SSE data");
      return null;
    }
  };
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const event = parse(buffer.slice(0, sep));
        buffer = buffer.slice(sep + 2);
        if (event) yield event;
      }
    }
    if (buffer.trim()) {
      const event = parse(buffer);
      if (event) yield event;
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

/** A sentence is over at . ! or ? (plus any closing quote) followed by whitespace. */
const SENTENCE_END = /[.!?]["')\]\u2019\u201d]*\s+/;
/** Evidence the Director adds on its own, per turn. The page should not lurch more often than this. */
const MAX_EVIDENCE = 3;

/**
 * Translate the OpenAI SSE stream into DirectorEvents, in order, with guarantees the model cannot be
 * trusted to keep on its own:
 *  - the answer comes first: an action the model emits before it has written anything is held until
 *    its words have streamed, then released;
 *  - a turn with no real answer is repaired: `repair` (a text-only second call) supplies the words,
 *    and only the evidence actions of the first call (never speak, draw, form or hue) are kept;
 *  - evidence follows the words: text is sent a sentence at a time, and a sentence that names a project
 *    or quotes a headline number brings the action that shows it (see evidence.ts). Without `repair`
 *    a wordless turn is passed through as it came.
 */
export async function* directorEvents(
  upstream: Response,
  repair?: () => Promise<Response | null>,
): AsyncGenerator<DirectorEvent> {
  let narration = 0;
  let text = "";
  let pending = "";
  let sentences = 0;
  let emittedChars = 0;
  let actionCount = 0;
  let evidenceCount = 0;
  const spoken = new Set<string>();
  const shown = new Set<string>();
  let sawEnd = false;
  let failed = false;
  let finished = false;
  let held: DirectorEvent[] = [];
  let endEmitted = false;
  const sent = (event: DirectorEvent): DirectorEvent => {
    if (event.type === "action" && event.action.name === "end_scene") endEmitted = true;
    return event;
  };

  /** Apply the per-turn caps and the no-repeats rule. Returns the event to send, or null to drop the action. */
  const admit = (action: DirectorAction): DirectorEvent | null => {
    if (action.name === "speak") {
      // One recorded line per id per turn, and a bounded number of lines.
      if (spoken.has(action.args.lineId) || spoken.size >= MAX_SPEAKS) return null;
      spoken.add(action.args.lineId);
      return { type: "action", action };
    }
    const key = shownKey(action);
    if (key && shown.has(key)) return null;
    if (action.name !== "end_scene" && actionCount >= MAX_ACTIONS - 1) return null; // always leave room for end_scene
    if (key) shown.add(key);
    actionCount += 1;
    if (action.name === "end_scene") sawEnd = true;
    return { type: "action", action };
  };

  /** One finished sentence, with the evidence for it. The first sentence goes first; later ones are led by their evidence. */
  const sentence = function* (raw: string): Generator<DirectorEvent> {
    const line = raw.trim();
    if (!line) return;
    const acts: DirectorEvent[] = [];
    if (!sawEnd && evidenceCount < MAX_EVIDENCE) {
      for (const action of evidenceFor(line, shown)) {
        const out = admit(action);
        if (out) {
          acts.push(out);
          evidenceCount += 1;
        }
      }
    }
    const words: DirectorEvent = { type: "text", delta: `${line} ` };
    emittedChars += line.length;
    const ordered = sentences === 0 ? [words, ...acts] : [...acts, words];
    sentences += 1;
    for (const e of ordered) yield sent(e);
  };

  /** Everything complete in `pending`, sentence by sentence. `all` also sends the unfinished rest. */
  const drain = function* (all: boolean): Generator<DirectorEvent> {
    let m: RegExpExecArray | null;
    while ((m = SENTENCE_END.exec(pending))) {
      const end = m.index + m[0].length;
      const done = pending.slice(0, end);
      pending = pending.slice(end);
      yield* sentence(done);
    }
    if (all) {
      const rest = pending;
      pending = "";
      yield* sentence(rest);
    }
  };

  const narrate = function* (delta: string): Generator<DirectorEvent> {
    if (!delta || narration >= MAX_NARRATION_CHARS) return;
    const clipped = delta.slice(0, MAX_NARRATION_CHARS - narration);
    narration += clipped.length;
    text += clipped;
    pending += clipped;
    yield* drain(false);
  };

  const handle = function* (event: SseEvent): Generator<DirectorEvent> {
    switch (event.type) {
      case "response.output_text.delta":
        yield* narrate(event.delta ?? "");
        return;
      case "response.output_item.done": {
        const item = event.item;
        // The words of a message item are out: anything held for waiting on them can go.
        if (item?.type === "message") {
          yield* drain(true);
          if (emittedChars > 0) {
            for (const e of held) yield sent(e);
            held = [];
          }
          return;
        }
        if (item?.type !== "function_call" || !item.name) return;
        if (sawEnd) return;
        const action: DirectorAction | null = toAction(item.name, item.arguments ?? "", (reason) =>
          console.warn("dropped action:", reason),
        );
        if (!action) return;
        const out = admit(action);
        if (!out) return;
        if (emittedChars < MIN_TEXT_CHARS_BEFORE_ACTIONS) held.push(out);
        else yield sent(out);
        return;
      }
      case "response.completed":
        finished = true;
        return;
      case "response.incomplete":
        finished = true; // keep whatever was produced; end_scene is appended below
        console.warn("openai response incomplete", event.response?.incomplete_details?.reason);
        return;
      case "response.failed":
      case "error":
        failed = true;
        console.error("openai stream error", event.response?.error?.message ?? event.message);
        return;
    }
  };

  for await (const event of sseEvents(upstream)) {
    yield* handle(event);
    if (failed) break;
  }

  if (failed || !finished) {
    yield { type: "error", message: "The Director lost the signal. Try again." };
    return;
  }
  yield* drain(true);

  if (repair && wordCount(text) < MIN_ANSWER_WORDS) {
    console.warn("director turn had no answer, repairing", wordCount(text));
    const second = await repair();
    if (second) {
      for await (const event of sseEvents(second)) {
        if (event.type === "response.output_text.delta") yield* narrate(event.delta ?? "");
      }
      yield* drain(true);
    }
    held = held.filter((e) => e.type === "action" && KEEP_ON_REPAIR.has(e.action.name));
  }

  for (const e of held) yield sent(e);
  if (!endEmitted) yield { type: "action", action: { name: "end_scene", args: {} } };
}
