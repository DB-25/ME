// Per-route first-load JS budget. For every page in the export, sums the gzipped size of the scripts its HTML loads
// (the chunks the browser fetches before anything is interacted with) and fails when a route grows more than
// TOLERANCE over the committed baseline in scripts/ci/js-budget.json.
// Usage: node scripts/ci/check-js-budget.mjs [outDir]            check against the baseline
//        node scripts/ci/check-js-budget.mjs [outDir] --update   rewrite the baseline from this build (commit it deliberately)
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const TOLERANCE = 0.15;
/** A route may always grow by this much, so a tiny page is not failed by a few hundred bytes of noise. */
const FLOOR_BYTES = 2048;
const args = process.argv.slice(2);
const update = args.includes("--update");
const out = path.resolve(args.find((a) => !a.startsWith("--")) ?? "out");
const baselineFile = path.join(path.dirname(fileURLToPath(import.meta.url)), "js-budget.json");

const gzipSize = (file) => zlib.gzipSync(fs.readFileSync(file), { level: 9 }).length;

function pages(dir, rel = "") {
  return fs.readdirSync(path.join(dir, rel), { withFileTypes: true }).flatMap((e) => {
    const r = path.join(rel, e.name);
    // _next is assets, _not-found and 404/ duplicate 404.html.
    if (e.isDirectory()) return e.name.startsWith("_") || r === "404" ? [] : pages(dir, r);
    return e.name === "index.html" || r === "404.html" ? [r] : [];
  });
}

/** Scripts the page loads up front: every <script src>, minus the nomodule polyfill bundle modern browsers skip. */
function firstLoadBytes(htmlFile) {
  const html = fs.readFileSync(htmlFile, "utf8");
  const srcs = [...html.matchAll(/<script\b([^>]*)\ssrc="([^"]+)"([^>]*)>/g)].filter((m) => !/noModule/i.test(m[1] + m[3])).map((m) => m[2]);
  let total = 0;
  for (const src of new Set(srcs)) {
    const i = src.indexOf("/_next/");
    if (i < 0) continue;
    const file = path.join(out, src.slice(i + 1));
    if (fs.existsSync(file)) total += gzipSize(file);
  }
  return total;
}

const current = {};
for (const page of pages(out).sort()) {
  const route = page === "404.html" ? "/404" : `/${path.dirname(page) === "." ? "" : `${path.dirname(page)}/`}`;
  current[route] = firstLoadBytes(path.join(out, page));
}

const kb = (n) => `${(n / 1024).toFixed(1)} KB`;
if (update) {
  fs.writeFileSync(baselineFile, `${JSON.stringify({ unit: "gzipped bytes of first-load scripts", tolerance: TOLERANCE, routes: current }, null, 2)}\n`);
  console.log(`baseline written: ${Object.keys(current).length} routes`);
  process.exit(0);
}

const baseline = JSON.parse(fs.readFileSync(baselineFile, "utf8")).routes;
const failures = [];
for (const [route, bytes] of Object.entries(current)) {
  const base = baseline[route];
  if (base === undefined) {
    console.log(`WARN ${route}: no baseline (${kb(bytes)}). Run with --update and commit js-budget.json.`);
    continue;
  }
  const limit = Math.max(base * (1 + TOLERANCE), base + FLOOR_BYTES);
  const delta = ((bytes - base) / base) * 100;
  console.log(`${route.padEnd(28)} ${kb(bytes).padStart(9)}  baseline ${kb(base).padStart(9)}  ${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`);
  if (bytes > limit) failures.push(`${route} first-load JS ${kb(bytes)} is over the ${kb(limit)} limit (baseline ${kb(base)} + ${TOLERANCE * 100}%)`);
}
if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log("js budget ok");
