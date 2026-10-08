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
export { METRIC_LABELS, PROJECT_NAMES } from ${JSON.stringify(src + "/knowledge")};
export * from ${JSON.stringify(src + "/evidence")};
export { SYSTEM_PROMPT } from ${JSON.stringify(src + "/prompt")};
export { handleVisit } from ${JSON.stringify(src + "/visits")};
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
    assert.match(m.SYSTEM_PROMPT, /Never answer with a recorded line alone/);
    assert.match(m.SYSTEM_PROMPT, /answer in words, first/);
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

  await test("stream: unknown ids dropped, repeats dropped, speaks capped at 2", async () => {
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
    assert.deepEqual(names, ["speak:aaaaaaaaaa", "goto_chapter", "speak:bbbbbbbbbb", "end_scene"]);
  });
  const textDelta = (delta) => ({ type: "response.output_text.delta", delta });
  const messageDone = { type: "response.output_item.done", item: { type: "message" } };
  const shape = (events) => events.map((e) => (e.type === "text" ? "T" : e.type === "action" ? e.action.name : e.type));
  const ANSWER = "I lead A-IEP's engineering and took it from prototype to production. ";

  await test("show_metric: known label accepted, unknown or missing dropped", () => {
    const label = m.METRIC_LABELS[0];
    assert.ok(label, "knowledge exports metric labels");
    assert.deepEqual(m.toAction("show_metric", JSON.stringify({ label }), onDrop), { name: "show_metric", args: { label } });
    for (const raw of ['{"label":"Revenue"}', "{}", '{"label":7}']) assert.equal(m.toAction("show_metric", raw, onDrop), null, raw);
    const tool = m.TOOLS.find((t) => t.name === "show_metric");
    assert.ok(tool && tool.strict);
    assert.deepEqual(tool.parameters.properties.label.enum, m.METRIC_LABELS);
  });
  await test("evidence: a headline number lights its figure, a named project is spotlighted", () => {
    const none = new Set();
    assert.deepEqual(m.evidenceFor("It has read 375+ IEPs.", none), [{ name: "show_metric", args: { label: "IEPs read by A-IEP" } }]);
    assert.deepEqual(m.evidenceFor("I lead A\u2011IEP, the special-education tool.", none), [{ name: "show_project", args: { slug: "a-iep" } }]);
    assert.deepEqual(m.evidenceFor("I wrote Smart Model.", none), [{ name: "show_project", args: { slug: "genie" } }]);
    assert.deepEqual(m.evidenceFor("Email me at dhruvbaradiya@gmail.com.", none), [{ name: "goto_chapter", args: { chapter: "contact" } }]);
    assert.deepEqual(m.evidenceFor("I like pani puri.", none), []);
    assert.deepEqual(m.evidenceFor("Ask me about A-IEP, GENIE, or arc-control-mcp.", none), []);
  });
  await test("evidence: nothing is shown twice, and a bare common word is not a project", () => {
    assert.deepEqual(m.evidenceFor("A-IEP again.", new Set(["project:a-iep"])), []);
    assert.deepEqual(m.evidenceFor("It has read 375 IEPs, via A-IEP.", new Set(["metric:IEPs read by A-IEP"])), [{ name: "show_project", args: { slug: "a-iep" } }]);
    assert.deepEqual(m.evidenceFor("I abetted nothing.", new Set()), []);
  });
  await test("evidence: every project name and every headline figure has a way to be noticed", () => {
    for (const [slug, name] of Object.entries(m.PROJECT_NAMES)) {
      const hit = m.evidenceFor(`I built ${name} myself.`, new Set());
      assert.deepEqual(hit, [{ name: "show_project", args: { slug } }], name);
    }
    const lit = new Set();
    for (const label of m.METRIC_LABELS) {
      const probe = { "IEPs read by A-IEP": "375+", "Monthly active users on Acharya ERP": "16,148", "State employees with access": "44,000+", "AI tools shipped": "26 AI tools", "Engineers mentored": "mentored 50+ engineers", "Place, AWS x Riot Games hackathon": "second place", "NASPO awards for ABE and One-L": "NASPO" }[label];
      assert.ok(probe, `add a probe for the new figure "${label}"`);
      for (const a of m.evidenceFor(probe, lit)) if (a.name === "show_metric") lit.add(a.args.label);
    }
    assert.equal(lit.size, m.METRIC_LABELS.length);
  });
  await test("stream: a sentence that names a project brings its evidence; the first sentence goes before it, later ones after", async () => {
    const out = await collect([
      textDelta("I lead A-IEP's engineering and took it to production. "),
      textDelta("It has read 375+ plans in four languages. "),
      textDelta("Write to me at the email on the contact chapter."),
      messageDone,
      call("end_scene", {}),
    ]);
    assert.deepEqual(shape(out), ["T", "show_project", "show_metric", "T", "goto_chapter", "T", "end_scene"]);
  });
  await test("stream: the model's own call for something already shown is dropped", async () => {
    const out = await collect([textDelta("I lead A-IEP's engineering and took it to production. "), messageDone, call("show_project", { slug: "a-iep" }), call("show_project", { slug: "genie" }), call("end_scene", {})]);
    assert.deepEqual(shape(out), ["T", "show_project", "show_project", "end_scene"]);
    assert.deepEqual(out.filter((e) => e.type === "action").map((e) => e.action.args.slug).filter(Boolean), ["a-iep", "genie"]);
  });
  await test("stream: an action the model emits before any words is held until the words are out", async () => {
    const out = await collect([call("show_project", { slug: "a-iep" }), textDelta(ANSWER), messageDone, call("end_scene", {})]);
    assert.deepEqual(shape(out), ["T", "show_project", "end_scene"]);
  });
  await test("stream: text first, then actions, passes straight through in order", async () => {
    const out = await collect([textDelta(ANSWER), messageDone, call("show_project", { slug: "a-iep" }), textDelta("Numbers next. "), messageDone, call("end_scene", {})]);
    assert.deepEqual(shape(out), ["T", "show_project", "T", "end_scene"]);
  });
  await test("stream: no words and no repair passes the turn through untouched", async () => {
    const out = await collect([call("draw", { svg: "<svg viewBox=\"0 0 512 512\"><circle cx=\"256\" cy=\"256\" r=\"80\"/></svg>", label: "x" }), call("end_scene", {})]);
    assert.deepEqual(shape(out), ["draw", "end_scene"]);
  });
  await test("stream: a turn with no answer is repaired, keeping evidence and dropping decoration", async () => {
    const first = sse([
      call("draw", { svg: "<svg viewBox=\"0 0 512 512\"><circle cx=\"256\" cy=\"256\" r=\"80\"/></svg>", label: "x" }),
      call("show_project", { slug: "genie" }),
      call("speak", { lineId: "aaaaaaaaaa" }),
      call("end_scene", {}),
      { type: "response.completed" },
    ]);
    const repair = async () => sse([textDelta("GENIE is the safe sandbox for Massachusetts state employees. "), textDelta("I wrote Smart Model, its router."), { type: "response.completed" }]);
    const out = [];
    for await (const e of m.directorEvents(first, repair)) out.push(e);
    assert.deepEqual(shape(out), ["T", "T", "show_project", "end_scene"]);
  });
  await test("stream: a short but real answer is not repaired", async () => {
    const first = sse([textDelta("That one is better asked to me directly, by email. "), messageDone, call("end_scene", {}), { type: "response.completed" }]);
    let repaired = false;
    const out = [];
    for await (const e of m.directorEvents(first, async () => ((repaired = true), null))) out.push(e);
    assert.equal(repaired, false);
    assert.deepEqual(shape(out), ["T", "end_scene"]);
  });
  await test("stream: a failed repair still ends the turn cleanly", async () => {
    const first = sse([call("end_scene", {}), { type: "response.completed" }]);
    const out = [];
    for await (const e of m.directorEvents(first, async () => null)) out.push(e);
    assert.deepEqual(shape(out), ["end_scene"]);
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

  // The visitors globe: POST /visit counts once per visitor per UTC day into 5 degree cells, GET /visits reads the map.
  const visitKv = () => {
    const map = new Map();
    const ttls = new Map();
    return { get: async (k) => map.get(k) ?? null, put: async (k, v, o) => (map.set(k, v), void ttls.set(k, o?.expirationTtl)), map, ttls };
  };
  const visitEnv = (extra = {}) => ({ OPENAI_MODEL: "m", VISITS_KV: visitKv(), VISIT_SALT: "test-salt", ...extra });
  const visit = (env, { ip = "203.0.113.7", cf = { latitude: "42.36", longitude: "-71.06", country: "us" }, origin = "http://localhost:3000" } = {}) => {
    const headers = { ...(origin ? { origin } : {}), ...(ip ? { "cf-connecting-ip": ip } : {}) };
    const req = new Request("https://w.example/visit", { method: "POST", headers });
    if (cf) Object.defineProperty(req, "cf", { value: cf });
    return m.worker.fetch(req, env, { waitUntil() {} });
  };
  const readVisits = (env, init = { headers: { origin: "http://localhost:3000" } }) => m.worker.fetch(new Request("https://w.example/visits", init), env, { waitUntil() {} });

  await test("/visit and /visits answer 503 visits_offline without the KV binding (and /visit without the salt)", async () => {
    for (const env of [{ OPENAI_MODEL: "m" }, { OPENAI_MODEL: "m", VISITS_KV: visitKv() }]) {
      const res = await visit(env);
      assert.equal(res.status, 503);
      assert.deepEqual(await res.json(), { error: "visits_offline" });
    }
    const res = await readVisits({ OPENAI_MODEL: "m" });
    assert.equal(res.status, 503);
    assert.deepEqual(await res.json(), { error: "visits_offline" });
  });
  await test("/visit bins into a 5 degree cell, counts once per visitor per day, and returns the visitor's own cell", async () => {
    const env = visitEnv();
    const first = await visit(env, { ip: "198.51.100.1" });
    assert.equal(first.status, 200);
    assert.deepEqual(await first.json(), { counted: true, cell: [42.5, -72.5], country: "US" });
    const again = await visit(env, { ip: "198.51.100.1" });
    assert.deepEqual(await again.json(), { counted: false, cell: [42.5, -72.5], country: "US" });
    // A neighbour in the same cell is a second visitor; one across the grid line is a third.
    assert.equal((await (await visit(env, { ip: "198.51.100.2", cf: { latitude: 44.9, longitude: -70.1, country: "US" } })).json()).counted, true);
    assert.deepEqual((await (await visit(env, { ip: "198.51.100.3", cf: { latitude: "12.97", longitude: "77.59", country: "IN" } })).json()).cell, [12.5, 77.5]);
    const map = await (await readVisits(env)).json();
    assert.equal(map.total, 3);
    assert.deepEqual(map.cells.sort((a, b) => b[2] - a[2]), [[42.5, -72.5, 2], [12.5, 77.5, 1]]);
    assert.deepEqual(map.countries, [["US", 2], ["IN", 1]]);
    assert.match(map.updatedAt, /^\d{4}-\d\d-\d\dT/);
  });
  await test("/visit keeps no raw IP, hashes with the salt, and expires the day marker after 26 hours", async () => {
    const env = visitEnv();
    await visit(env, { ip: "192.0.2.77" });
    const stored = JSON.stringify([...env.VISITS_KV.map.entries()]);
    assert.equal(stored.includes("192.0.2.77"), false);
    const markers = [...env.VISITS_KV.map.keys()].filter((k) => k.startsWith("seen:"));
    assert.equal(markers.length, 1);
    assert.equal(env.VISITS_KV.ttls.get(markers[0]), 26 * 60 * 60);
    // A different salt means a different marker: the hash really depends on it.
    const other = visitEnv({ VISIT_SALT: "another-salt" });
    await visit(other, { ip: "192.0.2.77" });
    assert.notEqual([...other.VISITS_KV.map.keys()].find((k) => k.startsWith("seen:")), markers[0]);
  });
  await test("/visit counts a returning visitor again on the next UTC day", async () => {
    const env = visitEnv();
    const req = (ip) => {
      const r = new Request("https://w.example/visit", { method: "POST", headers: { origin: "http://localhost:3000", "cf-connecting-ip": ip } });
      Object.defineProperty(r, "cf", { value: { latitude: 1, longitude: 1, country: "SG" } });
      return r;
    };
    const day1 = Date.UTC(2026, 9, 3, 23, 59);
    const day2 = Date.UTC(2026, 9, 4, 0, 1);
    const counted = async (now) => (await (await m.handleVisit(req("192.0.2.200"), env, {}, now)).json()).counted;
    assert.equal(await counted(day1), true);
    assert.equal(await counted(day1), false);
    assert.equal(await counted(day2), true);
  });
  await test("/visit without a location counts nothing; without an IP it is refused; the 11th call from one IP is rate limited", async () => {
    const env = visitEnv();
    const nowhere = await visit(env, { ip: "192.0.2.10", cf: null });
    assert.deepEqual(await nowhere.json(), { counted: false, cell: null, country: null });
    assert.equal(env.VISITS_KV.map.size, 0);
    assert.equal((await visit(env, { ip: "" })).status, 400);
    let last;
    for (let i = 0; i < 11; i++) last = await visit(env, { ip: "192.0.2.99" });
    assert.equal(last.status, 429);
  });
  await test("/visit follows the CORS rules: a missing or foreign Origin is refused, other methods are 405", async () => {
    const env = visitEnv();
    assert.equal((await visit(env, { origin: "" })).status, 403);
    assert.equal((await visit(env, { origin: "https://evil.example" })).status, 403);
    const unlisted = await visit(env, { ip: "192.0.2.50", origin: "https://db-25.github.io", cf: { latitude: 0, longitude: 0, country: "GH" } });
    assert.equal(unlisted.status, 403, "not in ALLOWED_ORIGINS unless configured");
    const allowed = await visit(visitEnv({ ALLOWED_ORIGINS: "https://db-25.github.io" }), { ip: "192.0.2.51", origin: "https://db-25.github.io" });
    assert.equal(allowed.status, 200);
    assert.equal(allowed.headers.get("access-control-allow-origin"), "https://db-25.github.io");
    const get = await m.worker.fetch(new Request("https://w.example/visit", { headers: { origin: "http://localhost:3000" } }), env, { waitUntil() {} });
    assert.equal(get.status, 405);
  });
  await test("/visits is cacheable for a minute, empty before the first visit, and rejects POST", async () => {
    const env = visitEnv();
    const res = await readVisits(env);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get("cache-control"), "public, max-age=60");
    assert.deepEqual(await res.json(), { cells: [], total: 0, countries: [], updatedAt: null });
    const post = await m.worker.fetch(new Request("https://w.example/visits", { method: "POST", headers: { origin: "http://localhost:3000" } }), env, { waitUntil() {} });
    assert.equal(post.status, 405);
    const foreign = await readVisits(env, { headers: { origin: "https://evil.example" } });
    assert.equal(foreign.status, 403);
  });

  globalThis.fetch = realFetch;

  console.log(`\n${passed} tests passed`);
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
