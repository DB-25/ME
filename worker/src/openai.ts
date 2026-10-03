import { toAction } from "./actions";
import type { DirectorAction, DirectorEvent, DirectorMessage } from "./protocol";
import { SYSTEM_PROMPT } from "./prompt";
import { TOOLS } from "./tools";

export type OpenAIConfig = { apiKey: string; model: string; reasoningEffort: string };

const OPENAI_URL = "https://api.openai.com/v1/responses";
const MAX_ACTIONS = 6;
const MAX_NARRATION_CHARS = 1200;
const MAX_OUTPUT_TOKENS = 8000;

/**
 * Open the streaming Responses API call. Returns null on any upstream failure
 * (logged server side) so the caller can answer 502 and the client goes offline.
 */
export async function openUpstream(config: OpenAIConfig, messages: DirectorMessage[]): Promise<Response | null> {
  const body: Record<string, unknown> = {
    model: config.model,
    instructions: SYSTEM_PROMPT,
    input: messages.map((m) => ({ role: m.role, content: m.content })),
    tools: TOOLS,
    tool_choice: "auto",
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

/** Translate the OpenAI SSE stream into DirectorEvents, in order. */
export async function* directorEvents(upstream: Response): AsyncGenerator<DirectorEvent> {
  const reader = upstream.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let narration = 0;
  let actionCount = 0;
  let sawEnd = false;
  let failed = false;
  let finished = false;

  const handle = function* (event: SseEvent): Generator<DirectorEvent> {
    switch (event.type) {
      case "response.output_text.delta": {
        if (!event.delta || narration >= MAX_NARRATION_CHARS) return;
        const delta = event.delta.slice(0, MAX_NARRATION_CHARS - narration);
        narration += delta.length;
        yield { type: "text", delta };
        return;
      }
      case "response.output_item.done": {
        const item = event.item;
        if (item?.type !== "function_call" || !item.name) return;
        if (sawEnd) return;
        const action: DirectorAction | null = toAction(item.name, item.arguments ?? "", (reason) =>
          console.warn("dropped action:", reason),
        );
        if (!action) return;
        if (action.name !== "end_scene" && actionCount >= MAX_ACTIONS - 1) return; // always leave room for end_scene
        actionCount += 1;
        if (action.name === "end_scene") sawEnd = true;
        yield { type: "action", action };
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

  const parse = function* (block: string): Generator<DirectorEvent> {
    const data = block
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    try {
      yield* handle(JSON.parse(data) as SseEvent);
    } catch (err) {
      if (!(err instanceof SyntaxError)) throw err;
      console.warn("unparseable SSE data");
    }
  };

  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const block = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        yield* parse(block);
        if (failed) break;
      }
      if (failed) break;
    }
    if (buffer.trim()) yield* parse(buffer);
  } finally {
    reader.cancel().catch(() => undefined);
  }

  if (failed || !finished) {
    yield { type: "error", message: "The Director lost the signal. Try again." };
    return;
  }
  if (!sawEnd) yield { type: "action", action: { name: "end_scene", args: {} } };
}
