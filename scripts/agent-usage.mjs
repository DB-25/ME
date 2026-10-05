#!/usr/bin/env node
/**
 * Aggregates DB's local Claude Code logs (~/.claude/projects/**.jsonl) into
 * src/content/agent-usage.json for the "Built with agents" panel.
 *
 * Only counts leave this machine: no prompts, file names, project names or
 * message text are read into the output. Run it locally (CI has no logs) and
 * commit the JSON: `node scripts/agent-usage.mjs`.
 */
import { readdirSync, statSync, createReadStream, writeFileSync } from "node:fs";
import { join } from "node:path";
import readline from "node:readline";

const ROOT = join(process.env.HOME, ".claude", "projects");
const OUT = new URL("../src/content/agent-usage.json", import.meta.url);

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

const keys = [...days.keys()].sort();
if (keys.length === 0) throw new Error(`No Claude Code turns found under ${ROOT}`);
const total = tokens.input + tokens.output + tokens.cacheWrite + tokens.cacheRead;
const busiest = keys.reduce((a, b) => (days.get(b).turns > days.get(a).turns ? b : a));

const out = {
  generatedAt: new Date().toISOString().slice(0, 10),
  from: keys[0],
  to: keys[keys.length - 1],
  activeDays: keys.length,
  sessions: sessions.size,
  subagents: subagents.size,
  turns: turnsSeen.size,
  prompts,
  toolCalls,
  tokens: { ...tokens, total, cacheShare: Number((tokens.cacheRead / total).toFixed(3)) },
  families,
  busiest: { day: busiest, turns: days.get(busiest).turns },
  daily: keys.map((day) => [day, days.get(day).turns]),
};

writeFileSync(OUT, `${JSON.stringify(out, null, 2)}\n`);
console.log(`agent-usage: ${out.activeDays} days, ${out.sessions} sessions, ${out.subagents} subagents, ${out.tokens.output} output tokens`);
