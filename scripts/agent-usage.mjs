#!/usr/bin/env node
/**
 * Aggregates DB's local Claude Code logs (~/.claude/projects/**.jsonl), Codex
 * sessions (~/.codex/sessions/**.jsonl) and Cursor's chat database into
 * src/content/agent-usage.json for the "Built with agents" panel.
 *
 * Only counts leave this machine: no prompts, file names, project names or
 * message text are read into the output. Run it locally (CI has no logs) and
 * commit the JSON: `node scripts/agent-usage.mjs`.
 */
import { readdirSync, readFileSync, statSync, createReadStream, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import readline from "node:readline";

const ROOT = join(process.env.HOME, ".claude", "projects");
const OUT = new URL("../src/content/agent-usage.json", import.meta.url);
const CODEX_ROOT = join(process.env.HOME, ".codex", "sessions");
const CURSOR_DB = join(process.env.HOME, "Library", "Application Support", "Cursor", "User", "globalStorage", "state.vscdb");
// Cursor's bubble types: 1 is a message I wrote, 2 is the model's reply.
const CURSOR_USER = 1;
const CURSOR_AI = 2;

function logFiles(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return logFiles(path);
    return name.endsWith(".jsonl") ? [path] : [];
  });
}

/** Model ids collapse to a family, so the output names no internal builds. */
function family(model = "") {
  const match = /claude-(opus|sonnet|haiku|fable)/.exec(model);
  return match ? match[1] : null;
}

const days = new Map();
const sessions = new Set();
const subagents = new Set();
const turnsSeen = new Set();
const families = {};
const tokens = { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 };
let toolCalls = 0;
let prompts = 0;

function dayOf(iso) {
  const key = iso.slice(0, 10);
  if (!days.has(key)) days.set(key, { turns: 0, output: 0 });
  return days.get(key);
}

function record(entry) {
  if (!entry.timestamp) return;
  if (entry.sessionId) sessions.add(entry.sessionId);
  if (entry.isSidechain && entry.sessionId) subagents.add(`${entry.sessionId}:${entry.agentId ?? ""}`);
  if (entry.type === "user" && !entry.isSidechain && typeof entry.message?.content === "string") prompts++;
  if (entry.type !== "assistant" || !entry.message?.usage) return;

  // A streamed turn is logged once per content block with the same id and usage.
  const id = `${entry.message.id}:${entry.requestId ?? ""}`;
  if (turnsSeen.has(id)) return;
  turnsSeen.add(id);

  const usage = entry.message.usage;
  tokens.input += usage.input_tokens ?? 0;
  tokens.output += usage.output_tokens ?? 0;
  tokens.cacheWrite += usage.cache_creation_input_tokens ?? 0;
  tokens.cacheRead += usage.cache_read_input_tokens ?? 0;
  const fam = family(entry.message.model);
  if (fam) families[fam] = (families[fam] ?? 0) + 1;
  if (Array.isArray(entry.message.content)) {
    toolCalls += entry.message.content.filter((c) => c.type === "tool_use").length;
  }
  const day = dayOf(entry.timestamp);
  day.turns++;
  day.output += usage.output_tokens ?? 0;
}

for (const file of logFiles(ROOT)) {
  const lines = readline.createInterface({ input: createReadStream(file), crlfDelay: Infinity });
  for await (const line of lines) {
    try {
      record(JSON.parse(line));
    } catch {
      // A line cut off mid-write by a running session is expected; skip it.
    }
  }
}

// Claude Code's own figures, before Cursor's are added to the shared day map.
const claude = { from: [...days.keys()].sort()[0], sessions: sessions.size, turns: turnsSeen.size, prompts, toolCalls, days: days.size };

/**
 * Cursor keeps chats in a SQLite key-value table: composerData:<chat> rows and
 * bubbleId:<chat>:<message> rows. Only ids, types, timestamps and whether a
 * message called a tool are selected; no text leaves the database. Older
 * messages carry no timestamp of their own, so they count on the day their
 * chat started. Cursor records token counts on too few messages to total, so
 * tokens stay Claude Code's alone.
 */
function cursorUsage() {
  if (!existsSync(CURSOR_DB)) return null;
  const query = (sql) =>
    execFileSync("/usr/bin/sqlite3", ["-readonly", "-separator", "\t", `file:${CURSOR_DB}?immutable=1`, sql], {
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
    })
      .split("\n")
      .filter(Boolean)
      .map((line) => line.split("\t"));
  const chatDay = new Map(
    query(
      "select substr(key, 14), json_extract(value, '$.createdAt') from cursorDiskKV where key like 'composerData:%' and json_valid(value)",
    ).map(([id, ms]) => [id, ms ? new Date(Number(ms)).toISOString() : null]),
  );
  const out = { chats: chatDay.size, prompts: 0, turns: 0, toolCalls: 0, tracked: { prompts: 0, tokens: 0, output: 0 } };
  // The slice of chats where Cursor did record token counts, as a per-prompt rate for the rest.
  const [tracked] = query(
    "with b as (select substr(key, 10, 36) chat, json_extract(value, '$.type') t, coalesce(json_extract(value, '$.tokenCount.inputTokens'), 0) i, coalesce(json_extract(value, '$.tokenCount.outputTokens'), 0) o from cursorDiskKV where key like 'bubbleId:%' and json_valid(value)), c as (select distinct chat from b where i > 0 or o > 0) select (select count(*) from b where t = 1 and chat in (select chat from c)), (select sum(i) + sum(o) from b), (select sum(o) from b)",
  );
  out.tracked = { prompts: Number(tracked[0]), tokens: Number(tracked[1]), output: Number(tracked[2]) };
  const rows = query(
    "select substr(key, 10, 36), json_extract(value, '$.type'), json_extract(value, '$.createdAt'), json_extract(value, '$.toolFormerData') is not null from cursorDiskKV where key like 'bubbleId:%' and json_valid(value)",
  );
  for (const [chat, type, createdAt, isTool] of rows) {
    const when = createdAt || chatDay.get(chat);
    if (Number(type) === CURSOR_USER) out.prompts++;
    if (Number(type) !== CURSOR_AI) continue;
    out.turns++;
    if (isTool === "1") out.toolCalls++;
    if (when) dayOf(when).turns++;
  }
  return out;
}

const cursor = cursorUsage();

/**
 * Codex writes one rollout file per thread. A thread with a parent is a
 * subagent. Token counts are cumulative, so each thread's last count is its total.
 */
function codexUsage() {
  if (!existsSync(CODEX_ROOT)) return null;
  const out = { sessions: 0, subagents: 0, turns: 0, prompts: 0, toolCalls: 0, tokens: 0, output: 0 };
  const TOOL_ITEMS = new Set(["function_call", "custom_tool_call", "web_search_call"]);
  const files = (function walk(dir) {
    return readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      if (statSync(path).isDirectory()) return walk(path);
      return name.endsWith(".jsonl") ? [path] : [];
    });
  })(CODEX_ROOT);
  for (const file of files) {
    let last = null;
    for (const line of readFileSync(file, "utf8").split("\n")) {
      let e;
      try {
        e = JSON.parse(line);
      } catch {
        continue;
      }
      const p = e.payload ?? {};
      if (e.type === "session_meta") p.parent_thread_id || p.parent_id ? out.subagents++ : out.sessions++;
      if (e.type === "response_item" && p.type === "message" && p.role === "user") out.prompts++;
      if (e.type === "response_item" && TOOL_ITEMS.has(p.type)) out.toolCalls++;
      if (e.type === "event_msg" && p.type === "token_count" && p.info?.total_token_usage) {
        last = p.info.total_token_usage;
        out.turns++;
        if (e.timestamp) dayOf(e.timestamp).turns++;
      }
    }
    if (last) {
      out.tokens += last.total_tokens ?? 0;
      out.output += (last.output_tokens ?? 0) + (last.reasoning_output_tokens ?? 0);
    }
  }
  return out;
}

const codex = codexUsage();

const keys = [...days.keys()].sort();
if (keys.length === 0) throw new Error(`No Claude Code turns found under ${ROOT}`);
const total = tokens.input + tokens.output + tokens.cacheWrite + tokens.cacheRead;
const busiest = keys.reduce((a, b) => (days.get(b).turns > days.get(a).turns ? b : a));

/**
 * Every token the three tools used, as a range. Claude Code and Codex are
 * counted; Cursor kept counts for only a slice of its chats, so its share runs
 * from its own per-prompt rate (low: it misses an agent's intermediate turns)
 * to Claude Code's per-turn rate (high).
 */
function allTools() {
  const counted = { tokens: total + (codex?.tokens ?? 0), output: tokens.output + (codex?.output ?? 0) };
  if (!cursor?.tracked.prompts) return { low: counted, high: counted };
  const perPrompt = { tokens: cursor.tracked.tokens / cursor.tracked.prompts, output: cursor.tracked.output / cursor.tracked.prompts };
  const perTurn = { tokens: total / claude.turns, output: tokens.output / claude.turns };
  const span = (rate, n) => ({ tokens: Math.round(counted.tokens + rate.tokens * n), output: Math.round(counted.output + rate.output * n) });
  return { low: span(perPrompt, cursor.prompts), high: span(perTurn, cursor.turns) };
}

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  from: keys[0],
  to: keys[keys.length - 1],
  activeDays: keys.length,
  sessions: claude.sessions + (cursor?.chats ?? 0) + (codex?.sessions ?? 0),
  subagents: subagents.size + (codex?.subagents ?? 0),
  turns: claude.turns + (cursor?.turns ?? 0) + (codex?.turns ?? 0),
  prompts: claude.prompts + (cursor?.prompts ?? 0) + (codex?.prompts ?? 0),
  toolCalls: claude.toolCalls + (cursor?.toolCalls ?? 0) + (codex?.toolCalls ?? 0),
  tools: { claudeCode: claude, cursor, codex },
  allTools: allTools(),
  tokens: { ...tokens, total, cacheShare: Number((tokens.cacheRead / total).toFixed(3)) },
  families,
  busiest: { day: busiest, turns: days.get(busiest).turns },
  daily: keys.map((day) => [day, days.get(day).turns]),
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`agent-usage: all tools ${(out.allTools.low.tokens / 1e9).toFixed(1)}B to ${(out.allTools.high.tokens / 1e9).toFixed(1)}B tokens; ${out.from} to ${out.to}, ${out.activeDays} days, ${out.sessions} sessions and chats, ${out.toolCalls} tool calls, ${out.subagents} subagents, ${out.tokens.output} output tokens (Claude Code)`);
