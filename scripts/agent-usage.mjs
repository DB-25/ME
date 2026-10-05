#!/usr/bin/env node
/**
 * Aggregates DB's local Claude Code logs (~/.claude/projects/**.jsonl) and
 * Cursor's chat database into src/content/agent-usage.json for the "Built with
 * agents" panel.
 *
 * Only counts leave this machine: no prompts, file names, project names or
 * message text are read into the output. Run it locally (CI has no logs) and
 * commit the JSON: `node scripts/agent-usage.mjs`.
 */
import { readdirSync, statSync, createReadStream, writeFileSync, existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join } from "node:path";
import readline from "node:readline";

const ROOT = join(process.env.HOME, ".claude", "projects");
const OUT = new URL("../src/content/agent-usage.json", import.meta.url);
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
  const out = { chats: chatDay.size, prompts: 0, turns: 0, toolCalls: 0 };
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

const keys = [...days.keys()].sort();
if (keys.length === 0) throw new Error(`No Claude Code turns found under ${ROOT}`);
const total = tokens.input + tokens.output + tokens.cacheWrite + tokens.cacheRead;
const busiest = keys.reduce((a, b) => (days.get(b).turns > days.get(a).turns ? b : a));

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  from: keys[0],
  to: keys[keys.length - 1],
  activeDays: keys.length,
  sessions: claude.sessions + (cursor?.chats ?? 0),
  subagents: subagents.size,
  turns: claude.turns + (cursor?.turns ?? 0),
  prompts: claude.prompts + (cursor?.prompts ?? 0),
  toolCalls: claude.toolCalls + (cursor?.toolCalls ?? 0),
  tools: { claudeCode: claude, cursor },
  tokens: { ...tokens, total, cacheShare: Number((tokens.cacheRead / total).toFixed(3)) },
  families,
  busiest: { day: busiest, turns: days.get(busiest).turns },
  daily: keys.map((day) => [day, days.get(day).turns]),
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`agent-usage: ${out.from} to ${out.to}, ${out.activeDays} days, ${out.sessions} sessions and chats, ${out.toolCalls} tool calls, ${out.subagents} subagents, ${out.tokens.output} output tokens (Claude Code)`);
