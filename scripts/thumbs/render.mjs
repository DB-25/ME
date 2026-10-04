// Render the thumbnails for every slug in config.mjs (or one slug):
//   public/films/<slug>-thumb.jpg     1600x900 (16:9)
//   public/films/<slug>-thumb-43.jpg  1200x900 (4:3)
// Then build contact sheets at the sizes the site actually shows them (300px phones, 520px hover previews)
// in scripts/thumbs/sheets/. Run `node scripts/thumbs/extract.mjs [slug]` first when a crop changed.
// Usage: node scripts/thumbs/render.mjs [slug] [--no-sheets]
import { chromium } from "playwright";
import sharp from "sharp";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { THUMBS } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const outDir = path.join(root, "public/films");
const sheetDir = path.join(here, "sheets");
const args = process.argv.slice(2);
const only = args.find((a) => !a.startsWith("--"));
const wantSheets = !args.includes("--no-sheets");
const VARIANTS = [
  { v: "169", w: 1600, suffix: "-thumb" },
  { v: "43", w: 1200, suffix: "-thumb-43" },
];
const SHEET_WIDTHS = [300, 520];

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

const list = THUMBS.filter((x) => !only || x.slug === only);
if (!list.length) throw new Error(`unknown slug: ${only}`);
const browser = await chromium.launch({ executablePath: findChromium() });
const page = await browser.newPage({ deviceScaleFactor: 1 });
const url = (slug, v) => `file://${path.join(here, "template.html")}?slug=${slug}&v=${v}`;

for (const t of list) {
  for (const { v, w, suffix } of VARIANTS) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.goto(url(t.slug, v));
    await page.waitForFunction(() => window.__ready === true);
    await page.waitForTimeout(150);
    const png = await page.screenshot();
    const jpg = path.join(outDir, `${t.slug}${suffix}.jpg`);
    await sharp(png).jpeg({ quality: 90, mozjpeg: true, chromaSubsampling: "4:4:4" }).toFile(jpg);
    console.log("wrote", path.relative(root, jpg), `${(fs.statSync(jpg).size / 1024).toFixed(0)}KB`);
  }
}
await browser.close();

if (wantSheets) {
  fs.mkdirSync(sheetDir, { recursive: true });
  const GAP = 24, PAD = 24, COLS = 3;
  for (const { suffix, v } of VARIANTS) {
    for (const sw of SHEET_WIDTHS) {
      const cell = [];
      for (const t of THUMBS) {
        const f = path.join(outDir, `${t.slug}${suffix}.jpg`);
        if (fs.existsSync(f)) cell.push(await sharp(f).resize({ width: sw, kernel: "lanczos3" }).png().toBuffer());
      }
      const ch = Math.round(sw * (v === "169" ? 9 / 16 : 3 / 4));
      const rows = Math.ceil(cell.length / COLS);
      const sheet = sharp({ create: { width: PAD * 2 + COLS * sw + (COLS - 1) * GAP, height: PAD * 2 + rows * ch + (rows - 1) * GAP, channels: 3, background: "#1c1a24" } });
      const out = path.join(sheetDir, `sheet-${v}-${sw}.png`);
      await sheet.composite(cell.map((input, i) => ({ input, left: PAD + (i % COLS) * (sw + GAP), top: PAD + Math.floor(i / COLS) * (ch + GAP) }))).png().toFile(out);
      console.log("sheet", path.relative(root, out));
    }
  }
}
