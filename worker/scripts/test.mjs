// Unit tests for the voice paths of the Worker. No network, no OpenAI key, no wrangler.
//   npm test
// Bundles src/ with esbuild, swapping ./voice for a fixed three-line library.
import { build } from "esbuild";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, "../src");
const tmp = mkdtempSync(join(tmpdir(), "director-test-"));

const fakeVoice = join(tmp, "voice.ts");
writeFileSync(
  fakeVoice,
  `export const VOICE_LINES = [
  { id: "aaaaaaaaaa", text: "Line one.", tags: ["intro"] },
  { id: "bbbbbbbbbb", text: "Line two.", tags: [] },
  { id: "cccccccccc", text: "Line three.", tags: ["recruiter"] },
];`,
);
const entry = join(tmp, "entry.ts");
writeFileSync(
  entry,
  `export * from ${JSON.stringify(src + "/actions")};
export * from ${JSON.stringify(src + "/openai")};
export * from ${JSON.stringify(src + "/tts")};
export * from ${JSON.stringify(src + "/tools")};
export { SYSTEM_PROMPT } from ${JSON.stringify(src + "/prompt")};
export { default as worker } from ${JSON.stringify(src + "/index")};`,
);
const outfile = join(tmp, "bundle.mjs");

try {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: "esm",
    platform: "node",
    logLevel: "error",
    plugins: [
      {
        name: "fake-voice",
        setup(b) {
          b.onResolve({ filter: /\/voice$/ }, () => ({ path: fakeVoice }));
        },
      },
    ],
  });
  const m = await import(pathToFileURL(outfile).href);
  let passed = 0;
  const test = async (name, fn) => {
    await fn();
    passed += 1;
    console.log("ok", name);
  };
  const drops = [];
  const onDrop = (r) => drops.push(r);

  await test("speak accepts a known id", () => {
    assert.deepEqual(m.toAction("speak", '{"lineId":"aaaaaaaaaa"}', onDrop), { name: "speak", args: { lineId: "aaaaaaaaaa" } });
  });
  await test("speak drops unknown, missing and non-string ids", () => {
    for (const raw of ['{"lineId":"zzzzzzzzzz"}', "{}", '{"lineId":7}', '{"lineId":"../x"}', "not json"]) {
      assert.equal(m.toAction("speak", raw, onDrop), null, raw);
    }
  });
  await test("speak tool has a strict enum of exactly the library ids", () => {
    const tool = m.TOOLS.find((t) => t.name === "speak");
    assert.ok(tool && tool.strict);
    assert.deepEqual(tool.parameters.properties.lineId.enum, ["aaaaaaaaaa", "bbbbbbbbbb", "cccccccccc"]);
    assert.deepEqual(tool.parameters.required, ["lineId"]);
    assert.equal(tool.parameters.additionalProperties, false);
  });
  await test("prompt carries the library and the voice rules", () => {
    assert.match(m.SYSTEM_PROMPT, /aaaaaaaaaa \[intro\] Line one\./);
    assert.match(m.SYSTEM_PROMPT, /bbbbbbbbbb Line two\./);
    assert.match(m.SYSTEM_PROMPT, /1 to 4 speak calls/);
  });

  // directorEvents over a mocked OpenAI SSE stream
  const sse = (events) =>
    new Response(events.map((e) => `data: ${JSON.stringify(e)}\n\n`).join(""), { headers: { "content-type": "text/event-stream" } });
  const call = (name, args) => ({ type: "response.output_item.done", item: { type: "function_call", name, arguments: JSON.stringify(args) } });
  const collect = async (events) => {
    const out = [];
    for await (const e of m.directorEvents(sse([...events, { type: "response.completed" }]))) out.push(e);
    return out;
  };

  await test("stream: unknown ids dropped, repeats dropped, speaks capped at 4", async () => {
    const out = await collect([
      call("speak", { lineId: "aaaaaaaaaa" }),
      call("speak", { lineId: "nope" }),
      call("speak", { lineId: "aaaaaaaaaa" }),
      call("goto_chapter", { chapter: "work" }),
      call("speak", { lineId: "bbbbbbbbbb" }),
      call("speak", { lineId: "cccccccccc" }),
      call("end_scene", {}),
    ]);
    const names = out.filter((e) => e.type === "action").map((e) => e.action.name + (e.action.args.lineId ? ":" + e.action.args.lineId : ""));
    assert.deepEqual(names, ["speak:aaaaaaaaaa", "goto_chapter", "speak:bbbbbbbbbb", "speak:cccccccccc", "end_scene"]);
  });
  await test("stream: speak after end_scene is ignored", async () => {
    const out = await collect([call("end_scene", {}), call("speak", { lineId: "aaaaaaaaaa" })]);
    assert.deepEqual(out.filter((e) => e.type === "action").map((e) => e.action.name), ["end_scene"]);
  });

  // TTS
  const base = { TTS_PROVIDER: "elevenlabs", ELEVENLABS_API_KEY: "k", ELEVENLABS_VOICE_ID: "abcdefghij0123456789", OPENAI_MODEL: "m" };
  await test("ttsConfig: off without provider or secrets, budget default and parsing", () => {
    assert.equal(m.ttsConfig({ OPENAI_MODEL: "m" }), null);
    assert.equal(m.ttsConfig({ ...base, TTS_PROVIDER: "" }), null);
    assert.equal(m.ttsConfig({ ...base, ELEVENLABS_API_KEY: undefined }), null);
    assert.equal(m.ttsConfig({ ...base, ELEVENLABS_VOICE_ID: "../x" }), null);
    assert.equal(m.ttsConfig(base).dailyBudget, 20000);
    assert.equal(m.ttsConfig({ ...base, TTS_DAILY_CHAR_BUDGET: "5000" }).dailyBudget, 5000);
    assert.equal(m.ttsConfig({ ...base, TTS_DAILY_CHAR_BUDGET: "junk" }).dailyBudget, 20000);
    assert.equal(m.ttsConfig(base).model, "eleven_flash_v2_5");
  });
  await test("parseTtsText: trims, collapses, caps at 300", () => {
    assert.equal(m.parseTtsText({ text: "  hi \n there " }), "hi there");
    assert.equal(m.parseTtsText({ text: "x".repeat(300) })?.length, 300);
    for (const bad of [{ text: "x".repeat(301) }, { text: "   " }, { text: 5 }, {}, null, "s"]) assert.equal(m.parseTtsText(bad), null);
  });
  const kvStore = () => {
    const map = new Map();
    return { get: async (k) => map.get(k) ?? null, put: async (k, v) => void map.set(k, v), map };
  };
  await test("reserveBudget: enforces the daily cap and rolls over at UTC midnight", async () => {
    const env = { OPENAI_MODEL: "m", TTS_KV: kvStore() };
    const day1 = Date.UTC(2026, 9, 3, 12);
    assert.equal(await m.reserveBudget(env, 100, 60, day1), true);
    assert.equal(await m.reserveBudget(env, 100, 40, day1), true);
    assert.equal(await m.reserveBudget(env, 100, 1, day1), false);
    assert.equal(await m.reserveBudget(env, 100, 60, Date.UTC(2026, 9, 4, 0, 0, 1)), true);
  });

  const call2 = (env, body, headers = {}) => {
    const stored = new Map();
    globalThis.caches = {
      default: {
        match: async (req) => stored.get(req.url)?.clone(),
        put: async (req, res) => void stored.set(req.url, res.clone()),
      },
    };
    const pending = [];
    const ctx = { waitUntil: (p) => void pending.push(p) };
    const req = new Request("https://w.example/tts", {
      method: "POST",
      headers: { origin: "http://localhost:3000", "cf-connecting-ip": "1.2.3.4", "content-type": "application/json", ...headers },
      body: typeof body === "string" ? body : JSON.stringify(body),
    });
    return m.worker.fetch(req, env, ctx).then(async (res) => (await Promise.all(pending), res));
  };

  await test("/tts disabled: 404 tts_disabled", async () => {
    const res = await call2({ OPENAI_MODEL: "m" }, { text: "hi" });
    assert.equal(res.status, 404);
    assert.deepEqual(await res.json(), { error: "tts_disabled" });
  });
  await test("/tts rejects missing Origin and other methods", async () => {
    const noOrigin = new Request("https://w.example/tts", { method: "POST", body: "{}" });
    assert.equal((await m.worker.fetch(noOrigin, base, { waitUntil() {} })).status, 403);
    const get = new Request("https://w.example/tts", { headers: { origin: "http://localhost:3000" } });
    assert.equal((await m.worker.fetch(get, base, { waitUntil() {} })).status, 405);
  });
  await test("/tts validates length and json", async () => {
    assert.equal((await call2({ ...base, TTS_KV: kvStore() }, { text: "x".repeat(301) })).status, 400);
    assert.equal((await call2({ ...base, TTS_KV: kvStore() }, "{nope")).status, 400);
  });

  let upstreamCalls = 0;
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (String(url).startsWith("https://api.elevenlabs.io/v1/text-to-speech/abcdefghij0123456789/stream")) {
      upstreamCalls += 1;
      assert.equal(init.headers["xi-api-key"], "k");
      assert.equal(JSON.parse(init.body).model_id, "eleven_flash_v2_5");
      return new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "audio/mpeg" } });
    }
    return realFetch(url, init);
  };
  await test("/tts streams audio, then serves the repeat from cache without budget or upstream", async () => {
    const env = { ...base, TTS_KV: kvStore(), TTS_DAILY_CHAR_BUDGET: "100" };
    // one shared cache across both calls
    const stored = new Map();
    globalThis.caches = {
      default: { match: async (r) => stored.get(r.url)?.clone(), put: async (r, res) => void stored.set(r.url, res.clone()) },
    };
    const send = async () => {
      const pending = [];
      const req = new Request("https://w.example/tts", {
        method: "POST",
        headers: { origin: "http://localhost:3000", "cf-connecting-ip": "9.9.9.9" },
        body: JSON.stringify({ text: "Hello there" }),
      });
      const res = await m.worker.fetch(req, env, { waitUntil: (p) => void pending.push(p) });
      const bytes = new Uint8Array(await res.arrayBuffer());
      await Promise.all(pending);
      return { res, bytes };
    };
    const first = await send();
    assert.equal(first.res.status, 200);
    assert.equal(first.res.headers.get("content-type"), "audio/mpeg");
    assert.equal(first.res.headers.get("x-tts-cache"), "miss");
    assert.deepEqual([...first.bytes], [1, 2, 3]);
    const second = await send();
    assert.equal(second.res.headers.get("x-tts-cache"), "hit");
    assert.deepEqual([...second.bytes], [1, 2, 3]);
    assert.equal(upstreamCalls, 1);
    assert.equal(env.TTS_KV.map.size, 1);
  });
  await test("/tts returns 429 tts_budget_exhausted once the day is spent", async () => {
    const env = { ...base, TTS_KV: kvStore(), TTS_DAILY_CHAR_BUDGET: "30" };
    assert.equal((await call2(env, { text: "x".repeat(25) }, { "cf-connecting-ip": "5.5.5.5" })).status, 200);
    const res = await call2(env, { text: "y".repeat(25) }, { "cf-connecting-ip": "5.5.5.5" });
    assert.equal(res.status, 429);
    assert.deepEqual(await res.json(), { error: "tts_budget_exhausted" });
  });
  globalThis.fetch = realFetch;

  console.log(`\n${passed} tests passed`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
