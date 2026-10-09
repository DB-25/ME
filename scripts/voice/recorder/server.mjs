#!/usr/bin/env node
/**
 * Local voice-sample recorder. Serves a one-page app on localhost, saves each take as
 * WAV under $VOICE_HOME/recordings, measures it with ffmpeg, and reads prompts and
 * notes from JSON files that Claude edits to ask for follow-ups or re-records.
 * Nothing leaves this Mac.  Run: node scripts/voice/recorder/server.mjs
 */
import { createServer } from "node:http";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, createReadStream, statSync } from "node:fs";
import { join, basename } from "node:path";
import { homedir } from "node:os";

const run = promisify(execFile);
const PORT = Number(process.env.PORT ?? 4471);
const HOME = process.env.VOICE_HOME ?? join(homedir(), "voice-clone");
const DIR = join(HOME, "recordings");
const TAKES = join(DIR, "takes");
const REPO = new URL("../../../", import.meta.url).pathname;
const OUT = join(REPO, "voice-sample.wav");
const PAGE = new URL("./index.html", import.meta.url);
const MAX_BODY = 200 * 1024 * 1024;

mkdirSync(TAKES, { recursive: true });
const file = (name) => join(DIR, name);
const readJson = (name, fallback) => {
  try {
    return JSON.parse(readFileSync(file(name), "utf8"));
  } catch {
    return fallback;
  }
};
const writeJson = (name, data) => writeFileSync(file(name), `${JSON.stringify(data, null, 2)}\n`);

if (!existsSync(file("prompts.json"))) {
  writeFileSync(file("prompts.json"), readFileSync(new URL("./prompts.default.json", import.meta.url)));
}

/** Loudness, peaks, noise floor and how much of the take is speech, all from ffmpeg. */
async function analyse(path) {
  const { stderr } = await run(
    "ffmpeg",
    ["-hide_banner", "-nostats", "-i", path, "-af", "astats=metadata=0:reset=0,ebur128=peak=true,silencedetect=n=-42dB:d=0.6", "-f", "null", "-"],
    { maxBuffer: 32 * 1024 * 1024 },
  );
  const num = (re, text = stderr) => {
    const m = text.match(re);
    return m ? Number(m[1]) : null;
  };
  // ebur128 prints a running line per frame; only its final Summary block is the take's loudness.
  const summary = stderr.slice(stderr.lastIndexOf("Summary:"));
  const duration = num(/Duration: \d+:(\d+):[\d.]+/) * 60 + num(/Duration: \d+:\d+:([\d.]+)/);
  const silence = [...stderr.matchAll(/silence_duration: ([\d.]+)/g)].reduce((s, m) => s + Number(m[1]), 0);
  const overall = stderr.slice(stderr.lastIndexOf("Overall"));
  const stat = (label) => {
    const m = overall.match(new RegExp(`${label}: (-?[\\d.]+|-inf)`));
    return m ? (m[1] === "-inf" ? -120 : Number(m[1])) : null;
  };
  const metrics = {
    seconds: Number(duration.toFixed(1)),
    speechSeconds: Number(Math.max(0, duration - silence).toFixed(1)),
    lufs: num(/I:\s+(-?[\d.]+) LUFS/, summary),
    truePeak: num(/Peak:\s+(-?[\d.]+) dBFS/, summary),
    peak: stat("Peak level dB"),
    rms: stat("RMS level dB"),
    noiseFloor: stat("Noise floor dB"),
  };
  return { metrics, flags: judge(metrics) };
}

/** Plain-language checks that matter for voice cloning. */
function judge(m) {
  const flags = [];
  if (m.peak !== null && m.peak > -1) flags.push({ level: "bad", text: "Clipping: move back a little or lower the input level." });
  if (m.lufs !== null && m.lufs < -32) flags.push({ level: "warn", text: "Quiet: move closer to the mic or speak up a bit." });
  if (m.noiseFloor !== null && m.noiseFloor > -55) flags.push({ level: "warn", text: "Background noise is high: a fan, AC or room echo is coming through." });
  if (m.seconds < 8) flags.push({ level: "warn", text: "Short take: aim for 20 seconds or more." });
  if (m.seconds > 0 && m.speechSeconds / m.seconds < 0.55) flags.push({ level: "warn", text: "Lots of silence: long pauses get trimmed, so keep talking." });
  if (flags.length === 0) flags.push({ level: "ok", text: "Clean take." });
  return flags;
}

function takesFor(promptId) {
  return readdirSync(TAKES)
    .filter((f) => f.startsWith(`${promptId}__`) && f.endsWith(".wav"))
    .sort()
    .map((f) => ({ file: f, ...(readJson(join("takes", `${f}.json`), {}) ?? {}) }));
}

function state() {
  const prompts = readJson("prompts.json", { prompts: [] });
  const notes = readJson("notes.json", { message: "", perPrompt: {} });
  const selected = readJson("selected.json", {});
  const items = prompts.prompts.map((p) => ({ ...p, takes: takesFor(p.id), selected: selected[p.id] ?? null, note: notes.perPrompt?.[p.id] ?? "" }));
  const chosen = items.map((p) => p.takes.find((t) => t.file === p.selected)).filter(Boolean);
  const speech = chosen.reduce((s, t) => s + (t.metrics?.speechSeconds ?? 0), 0);
  return { items, message: notes.message ?? "", speechSeconds: Number(speech.toFixed(1)), output: existsSync(OUT) ? basename(OUT) : null };
}

async function readBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) throw new Error("take too large");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Joins the chosen takes into one WAV for scripts/voice/prepare-sample.sh. */
async function finish() {
  const { items } = state();
  const chosen = items.filter((p) => p.selected).map((p) => join(TAKES, p.selected));
  if (chosen.length === 0) throw new Error("pick at least one take first");
  const list = file("concat.txt");
  writeFileSync(list, chosen.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n"));
  await run("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", list, "-ac", "1", "-ar", "48000", OUT]);
  return { output: OUT, takes: chosen.length };
}

const send = (res, code, body, type = "application/json") => {
  res.writeHead(code, { "content-type": type, "cache-control": "no-store" });
  res.end(type === "application/json" ? JSON.stringify(body) : body);
};

createServer(async (req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  try {
    if (req.method === "GET" && url.pathname === "/") return send(res, 200, readFileSync(PAGE), "text/html; charset=utf-8");
    if (req.method === "GET" && url.pathname === "/api/state") return send(res, 200, state());
    if (req.method === "GET" && url.pathname.startsWith("/takes/")) {
      const path = join(TAKES, basename(decodeURIComponent(url.pathname)));
      if (!existsSync(path)) return send(res, 404, { error: "not found" });
      res.writeHead(200, { "content-type": "audio/wav", "content-length": statSync(path).size });
      return createReadStream(path).pipe(res);
    }
    if (req.method === "POST" && url.pathname === "/api/take") {
      const prompt = (url.searchParams.get("prompt") ?? "").replace(/[^a-z0-9-]/gi, "");
      if (!prompt) return send(res, 400, { error: "missing prompt" });
      const name = `${prompt}__${new Date().toISOString().replace(/[:.]/g, "-")}.wav`;
      writeFileSync(join(TAKES, name), await readBody(req));
      const result = { ...(await analyse(join(TAKES, name))), device: url.searchParams.get("device") ?? "" };
      writeJson(join("takes", `${name}.json`), result);
      const selected = readJson("selected.json", {});
      writeJson("selected.json", { ...selected, [prompt]: name });
      return send(res, 200, { file: name, ...result });
    }
    if (req.method === "POST" && url.pathname === "/api/select") {
      const { prompt, file: take } = JSON.parse((await readBody(req)).toString() || "{}");
      writeJson("selected.json", { ...readJson("selected.json", {}), [prompt]: take });
      return send(res, 200, { ok: true });
    }
    if (req.method === "POST" && url.pathname === "/api/finish") return send(res, 200, await finish());
    send(res, 404, { error: "not found" });
  } catch (error) {
    console.error(error);
    send(res, 500, { error: error.message });
  }
}).listen(PORT, "127.0.0.1", () => console.log(`voice recorder on http://localhost:${PORT}  (data in ${DIR})`));
