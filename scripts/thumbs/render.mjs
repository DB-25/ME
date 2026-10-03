// Render the designed thumbnails: public/films/<slug>-thumb.jpg (1600x900) and <slug>-thumb-43.jpg (1200x900).
// Usage: node scripts/thumbs/render.mjs [slug] [--sheet=path]
import { chromium } from "playwright";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { THUMBS } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "public/films");
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const sheet = args.find((a) => a.startsWith("--sheet="))?.slice(8);

// config.js is a plain script so the template works from file:// (no module or fetch needed).
fs.writeFileSync(path.join(here, "config.js"), `/* eslint-disable */\nvar THUMBS = ${JSON.stringify(THUMBS)};\n`);

function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const base = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (!fs.existsSync(base)) return undefined;
  const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const p = path.join(base, d, "chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing");
    if (fs.existsSync(p)) return p;
  }
}

const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "thumbs-"));
const url = (slug, v) => `file://${path.join(here, "template.html")}?slug=${slug}&v=${v}`;

for (const t of THUMBS.filter((x) => !only || x.slug === only)) {
  for (const [v, w, suffix] of [["169", 1600, "-thumb"], ["43", 1200, "-thumb-43"]]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(url(t.slug, v));
    await page.waitForFunction(() => window.__ready === true);
    await page.waitForTimeout(150);
    const png = path.join(tmp, `${t.slug}${suffix}.png`);
    await page.screenshot({ path: png });
    const jpg = path.join(outDir, `${t.slug}${suffix}.jpg`);
    // sips: q85 JPEG without extra dependencies.
    execFileSync("sips", ["-s", "format", "jpeg", "-s", "formatOptions", "85", png, "--out", jpg], { stdio: "ignore" });
    console.log("wrote", path.relative(root, jpg), `${(fs.statSync(jpg).size / 1024).toFixed(0)}KB`);
  }
}
await browser.close();

if (sheet && !only) {
  const files = THUMBS.map((t) => path.join(outDir, `${t.slug}-thumb.jpg`));
  execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...files.flatMap((f) => ["-i", f]),
    "-filter_complex", `${files.map((_, i) => `[${i}:v]scale=800:-1[s${i}]`).join(";")};${files.map((_, i) => `[s${i}]`).join("")}xstack=inputs=6:layout=0_0|800_0|0_450|800_450|0_900|800_900[o]`,
    "-map", "[o]", "-frames:v", "1", sheet], { stdio: "inherit" });
  console.log("sheet", sheet);
}
