// Field-style budgets Lighthouse's simulated throttling cannot see, run against a served export.
//  1. CLS under a late web-font swap (fonts delayed 700 ms) at phone and desktop widths: must stay under 0.1.
//  2. Longest main-thread task at 4x CPU slowdown on a case page and home: a regression like a synchronous SVG scan fails here.
// Usage: BASE_URL=http://localhost:4173/ME node scripts/ci/check-vitals.mjs
import { chromium } from "playwright";

const base = (process.env.BASE_URL ?? "http://localhost:4173").replace(/\/$/, "");
const FONT_DELAY_MS = 700;
const CLS_BUDGET = 0.1;
// Calibrated on an M-series laptop (400 ms). Hosted CI runners are 2 to 3x slower before any throttling, so CI
// gets more headroom; it still fails the regressions this guards against (the old synchronous SVG scan ran 2 to 3 s).
const LONG_TASK_BUDGET_MS = Number(process.env.LONG_TASK_BUDGET_MS ?? (process.env.CI ? 1000 : 400));
const CPU_SLOWDOWN = 4;
const SETTLE_MS = 4000;

const observeScript = () => {
  window.__cls = 0;
  window.__tasks = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) if (!e.hadRecentInput) window.__cls += e.value;
  }).observe({ type: "layout-shift", buffered: true });
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) window.__tasks.push(e.duration);
  }).observe({ type: "longtask", buffered: true });
};

const browser = await chromium.launch({ channel: process.env.CI ? "chrome" : undefined, executablePath: process.env.CHROME_PATH });
const failures = [];

async function visit(path, { width, height, mobile, fontDelay, cpu }) {
  const context = await browser.newContext({ viewport: { width, height }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 2 : 1 });
  const page = await context.newPage();
  await page.addInitScript(observeScript);
  if (fontDelay) {
    await page.route("**/*.woff2", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, fontDelay));
      await route.continue();
    });
  }
  if (cpu) {
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: cpu });
  }
  await page.goto(`${base}${path}`, { waitUntil: "commit" });
  await page.waitForTimeout(SETTLE_MS);
  const result = await page.evaluate(() => ({ cls: window.__cls, longest: Math.max(0, ...window.__tasks) }));
  await context.close();
  return result;
}

for (const [width, height, mobile] of [[390, 844, true], [1440, 900, false]]) {
  const { cls } = await visit("/", { width, height, mobile, fontDelay: FONT_DELAY_MS });
  console.log(`CLS with late fonts at ${width}px: ${cls.toFixed(4)} (budget ${CLS_BUDGET})`);
  if (cls >= CLS_BUDGET) failures.push(`CLS ${cls.toFixed(3)} at ${width}px with a late font swap`);
}

for (const path of ["/", "/work/genie/", "/work/a-iep/", "/receipts/"]) {
  const { longest } = await visit(path, { width: 390, height: 844, mobile: true, cpu: CPU_SLOWDOWN });
  console.log(`longest task at ${CPU_SLOWDOWN}x CPU, ${path}: ${Math.round(longest)} ms (budget ${LONG_TASK_BUDGET_MS})`);
  if (longest > LONG_TASK_BUDGET_MS) failures.push(`long task ${Math.round(longest)} ms on ${path} at ${CPU_SLOWDOWN}x CPU`);
}

await browser.close();
if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
