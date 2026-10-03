#!/usr/bin/env node
/**
 * Exports the voice library: every line the Director can say aloud.
 *
 *   node scripts/voice/lines.mjs
 *
 * Writes scripts/voice/lines.json as [{ id, text, tags }]. Render one recording per
 * entry to public/voice/<id>.mp3, then run scripts/voice/manifest.mjs.
 *
 * The list is src/lib/director/voice-library.ts, run as is: the real TypeScript
 * (voice-library.ts, scripts.ts, match.ts, art.ts, @/content, lineId.ts) is
 * compiled to a temp folder, so nothing here can drift from what the site says
 * and the ids are the ones the browser computes. It also plays every scripted cut
 * and fails if any line it speaks is missing from the library.
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const ROOT = path.resolve(import.meta.dirname, "../..");
const require = createRequire(path.join(ROOT, "package.json"));
const ts = require("typescript");

const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "voice-lines-"));
const compiled = new Map();

function resolveSpecifier(spec, from) {
  const base = spec.startsWith("@/") ? path.join(ROOT, "src", spec.slice(2)) : path.resolve(path.dirname(from), spec);
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")]) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate;
  }
  throw new Error(`cannot resolve ${spec} from ${from}`);
}

/** Transpile one module (and, recursively, what it imports) into OUT. Returns its output path. */
function compile(file) {
  if (compiled.has(file)) return compiled.get(file);
  const out = path.join(OUT, path.relative(ROOT, file)).replace(/\.tsx?$/, ".mjs");
  compiled.set(file, out);
  const source = fs.readFileSync(file, "utf8");
  const js = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const rewritten = js.replace(/(\bfrom\s*|\bimport\s*)(["'])(\.{1,2}\/[^"']+|@\/[^"']+)\2/g, (_m, pre, q, spec) => {
    let rel = path.relative(path.dirname(out), compile(resolveSpecifier(spec, file)));
    if (!rel.startsWith(".")) rel = `./${rel}`;
    return `${pre}${q}${rel}${q}`;
  });
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, rewritten);
  return out;
}

const load = (rel) => import(pathToFileURL(compile(path.join(ROOT, rel))).href);

const { buildScript } = await load("src/components/director/scripts.ts");
const { lineId, normalizeLine } = await load("src/lib/director/lineId.ts");
const { VOICE_LINES } = await load("src/lib/director/voice-library.ts");
const { projects } = await load("src/content/index.ts");

const none = { hits: [], words: [], techWords: [] };
const base = { intent: null, score: 1, infra: false, rag: false, tech: none };
const hitOn = (slug) => ({
  hits: [{ slug, score: 1, stack: ["x"], words: ["x"] }],
  words: ["x"],
  techWords: ["x"],
});

/** Every shape of request that changes which lines are spoken. */
const matches = [
  ...["founder", "hiring", "engineer", "designer", "student", "gamer", "food", "offduty", "contact", "intro", "surprise"].map(
    (intent) => ({ ...base, intent }),
  ),
  { ...base, intent: "engineer", rag: true },
  base, // nothing matched
  ...projects.flatMap((p) => [
    { ...base, tech: hitOn(p.slug) }, // a technology only
    { ...base, intent: "hiring", tech: hitOn(p.slug) },
    { ...base, intent: "engineer", tech: hitOn(p.slug) },
  ]),
];

const inLibrary = new Set(VOICE_LINES.map((l) => l.id));
const spoken = new Map();
for (const match of matches) {
  for (const step of buildScript(match)) {
    if (!("say" in step)) continue;
    const text = normalizeLine(step.say);
    if (text) spoken.set(lineId(text), text);
  }
}
const missing = [...spoken].filter(([id]) => !inLibrary.has(id));
if (missing.length) {
  console.error("Scripted lines that are not in the voice library:");
  for (const [id, text] of missing) console.error(`  ${id}  ${text}`);
  process.exit(1);
}

const long = VOICE_LINES.filter((l) => l.text.split(/\s+/).length > 20);
const tooLong = long.map((l) => `  ${l.id}  (${l.text.split(/\s+/).length} words) ${l.text}`);

const target = path.join(ROOT, "scripts/voice/lines.json");
fs.writeFileSync(target, `${JSON.stringify(VOICE_LINES, null, 2)}\n`);
fs.rmSync(OUT, { recursive: true, force: true });
console.log(`${VOICE_LINES.length} lines (${spoken.size} used by the scripted tour) -> ${path.relative(process.cwd(), target)}`);
if (tooLong.length) console.log(`Longer than twenty words:\n${tooLong.join("\n")}`);
