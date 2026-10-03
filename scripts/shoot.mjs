// Screenshot every [data-chapter] section with the SIGNAL field running.
// Usage: node scripts/shoot.mjs [--mobile] [--bare] [--name=run] [--url=http://localhost:3102] [--only=hero,globe] [--svg] [--wait=2500]
import { chromium } from "playwright";
import fs from "node:fs";

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.replace(/^--/, "").split("=");
    return [k, v ?? true];
  }),
);
const mobile = Boolean(args.mobile);
const base = args.url || "http://localhost:3102";
const name = args.name || (mobile ? "mobile" : "desktop");
const wait = Number(args.wait || 2500);
const only = args.only ? String(args.only).split(",") : null;
const OUT =
  process.env.SHOT_DIR ||
  "/private/tmp/claude-501/-Users-db-Burnes-Center-Fulltime-ME/2d0e1ee7-52d8-489a-b564-da766d0888ce/scratchpad/shots";
fs.mkdirSync(OUT, { recursive: true });

// Use whichever Playwright chromium is installed locally (version drift between playwright and its browser cache).
import os from "node:os";
import path from "node:path";
function findChromium() {
  if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;
  const root = path.join(os.homedir(), "Library/Caches/ms-playwright");
  if (!fs.existsSync(root)) return undefined;
  const dirs = fs.readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse();
  for (const d of dirs) {
    const app = path.join(root, d, "chrome-mac-arm64");
    if (!fs.existsSync(app)) continue;
    const bundle = fs.readdirSync(app).find((f) => f.endsWith(".app"));
    if (bundle) return path.join(app, bundle, "Contents/MacOS", bundle.replace(/\.app$/, ""));
  }
  return undefined;
}

const browser = await chromium.launch({
  executablePath: findChromium(),
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const ctx = await browser.newContext({
  viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
  deviceScaleFactor: Number(args.dsf || 1),
  hasTouch: mobile,
  isMobile: mobile,
  reducedMotion: args.rm ? "reduce" : "no-preference",
});
const page = await ctx.newPage();
page.on("console", (m) => {
  if (["error", "warning"].includes(m.type())) console.log(`[console.${m.type()}]`, m.text().slice(0, 160));
});
page.on("pageerror", (e) => console.log("[pageerror]", e.message));

const sep = base.includes("?") ? "&" : "?";
await page.goto(`${base}${sep}fps&noadapt${args.intro ? "&introhold" : ""}`, { waitUntil: "load" });
if (args.intro) {
  // Capture the preloader hold (noise converging into the monogram) before ready/timeout fires.
  await page.waitForTimeout(Number(args.intro));
  await page.screenshot({ path: `${OUT}/${name}-intro.png` });
  await page.evaluate(() => window.__signal?.getState().set({ ready: true }));
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${OUT}/${name}-intro-dissolve.png` });
}
await page.waitForTimeout(Number(args.boot || 7000));

if (args.bare) await page.addStyleTag({ content: "main{visibility:hidden !important} nav,header,[data-chrome]{visibility:hidden !important}" });

const chapters = await page.$$eval("[data-chapter]", (els) => els.map((e) => e.getAttribute("data-chapter")));
console.log("chapters:", chapters.join(","));

const goTo = (id) =>
  page.evaluate((id) => {
    const el = document.querySelector(`[data-chapter="${id}"]`);
    if (!el) return;
    const y = el.getBoundingClientRect().top + window.scrollY;
    if (window.lenis) window.lenis.scrollTo(y, { immediate: true, force: true });
    else window.scrollTo(0, y);
  }, id);

for (const id of chapters) {
  if (only && !only.includes(id)) continue;
  await goTo(id);
  await page.waitForTimeout(wait);
  const st = await page.evaluate(() => ({ s: window.__signal?.getState(), fps: window.__signalFps }));
  console.log(id, "store:", st.s?.chapter, st.s?.morph?.toFixed(2), "fps:", st.fps);
  await page.screenshot({ path: `${OUT}/${name}-${id}.png`, ...(args.clip ? { clip: Object.fromEntries(String(args.clip).split(",").map((v, i) => [["x", "y", "width", "height"][i], Number(v)])) } : {}) });
}

if (args.svg) {
  await goTo("hero");
  await page.waitForTimeout(500);
  const ok = await page.evaluate(async () => {
    const svg = `<svg viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg" onload="alert(1)">
      <script>alert(1)</script><foreignObject><div>x</div></foreignObject>
      <image href="https://example.com/x.png" width="10" height="10"/>
      <g fill="none" stroke="#fff" stroke-width="7" stroke-linecap="round">
        <path d="M96 232 Q256 440 416 232 Z" fill="#fff" fill-opacity="0.5"/>
        <ellipse cx="256" cy="232" rx="160" ry="26"/>
        <path d="M232 168 C224 120 280 120 264 72"/><path d="M286 172 C300 130 250 110 268 60" />
        <circle cx="256" cy="120" r="34" stroke-dasharray="4 10"/>
        <line x1="150" y1="420" x2="362" y2="420"/>
      </g></svg>`;
    const points = await window.__signalTools.sampleSvg(svg, 24000);
    if (!points) return false;
    window.__signal.getState().set({ override: { kind: "points", points, label: "bowl" } });
    return points.length;
  });
  console.log("svg sampled:", ok);
  await page.waitForTimeout(wait + 3000);
  await page.screenshot({ path: `${OUT}/${name}-svg-bowl.png` });
  const bad = await page.evaluate(async () => (await window.__signalTools.sampleSvg("<svg><rect", 100)) === null);
  console.log("malformed svg returns null:", bad);
  await page.evaluate(() => window.__signal.getState().set({ override: null, hue: "#FFA94D" }));
  await page.waitForTimeout(wait + 1000);
  await page.screenshot({ path: `${OUT}/${name}-svg-cleared-hue.png` });
}

await browser.close();
