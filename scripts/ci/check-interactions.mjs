// Behaviour checks that a Lighthouse run never exercises, against a served export. Each one is a bug that shipped once:
//  1. A wheel scroll followed within 300 ms by a click on a project must open the case page at the top (Lenis momentum
//     used to leak across the route change).
//  2. Back within 300 ms of a wheel scroll on a case page must restore the home offset exactly.
//  3. "Pause motion" must leave no infinite animation running anywhere on the home page (the 7 CSS loops).
//  4. No duplicate ids on the pages that carry aria-labelledby headings.
//  5. /#about is a real address: it lands on the About chapter and rewrites the hash to #origin.
//  6. Starting a tour moves focus into the tour HUD instead of dropping it to <body>.
// Usage: BASE_URL=http://localhost:4173/ME node scripts/ci/check-interactions.mjs
import { chromium } from "playwright";

const base = (process.env.BASE_URL ?? "http://localhost:4173").replace(/\/$/, "");
const SETTLE_MS = 2500;
const CLICK_AFTER_WHEEL_MS = 300;
const TOLERANCE_PX = 3;

const browser = await chromium.launch({ channel: process.env.CI ? "chrome" : undefined, executablePath: process.env.CHROME_PATH });
const failures = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const check = (ok, message) => ok || failures.push(message);
const scrollY = (page) => page.evaluate(() => Math.round(window.scrollY));
const jump = (page, y) => page.evaluate((v) => (window.lenis ? window.lenis.scrollTo(v, { immediate: true, force: true }) : window.scrollTo(0, v)), y);

async function open(path, { init, width = 1440, height = 900 } = {}) {
  const context = await browser.newContext({ viewport: { width, height } });
  const page = await context.newPage();
  if (init) await page.addInitScript(init);
  await page.goto(`${base}${path}`, { waitUntil: "load" });
  await sleep(SETTLE_MS);
  return { page, close: () => context.close() };
}

const openFirstCase = async (page) => {
  await page.evaluate(() => document.querySelector('a[href*="/work/genie/"]')?.click());
  await page.waitForURL("**/work/genie/**", { timeout: 8000 });
  await sleep(SETTLE_MS);
};

// 1. Forward: wheel, then click a project inside the old Lenis animation window.
{
  const { page, close } = await open("/");
  const workTop = await page.evaluate(() => Math.round(document.getElementById("work").getBoundingClientRect().top + window.scrollY));
  await jump(page, workTop);
  await sleep(600);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 500);
  await sleep(CLICK_AFTER_WHEEL_MS);
  await openFirstCase(page);
  const y = await scrollY(page);
  console.log(`wheel then click: case page opens at scrollY ${y}`);
  check(y <= 50, `a click within ${CLICK_AFTER_WHEEL_MS} ms of a wheel scroll opened the case page at scrollY ${y}, not at the top`);
  await close();
}

// 2. Back: wheel on the case page, Back inside the animation window.
{
  const { page, close } = await open("/");
  await jump(page, 1200);
  await sleep(600);
  const saved = await scrollY(page);
  await openFirstCase(page);
  await page.mouse.move(700, 450);
  await page.mouse.wheel(0, 2400);
  await sleep(CLICK_AFTER_WHEEL_MS);
  await page.goBack();
  await sleep(SETTLE_MS);
  const y = await scrollY(page);
  console.log(`wheel then Back: home restored to ${y} (saved ${saved})`);
  check(Math.abs(y - saved) <= TOLERANCE_PX, `Back within ${CLICK_AFTER_WHEEL_MS} ms of a wheel scroll restored scrollY ${y}, expected ${saved}`);
  await close();
}

// 3. Pause motion leaves zero infinite animations, once every section has been visited.
{
  const { page, close } = await open("/", { init: () => localStorage.setItem("db25:motion", JSON.stringify({ paused: true, still: false })) });
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  for (let y = 0; y < height; y += 700) {
    await jump(page, y);
    await sleep(120);
  }
  const running = await page.evaluate(() => {
    const names = document
      .getAnimations()
      .filter((a) => a.effect?.getComputedTiming().iterations === Infinity && a.playState === "running")
      .map((a) => a.animationName ?? "unnamed");
    return { attr: document.documentElement.getAttribute("data-motion"), names: [...new Set(names)] };
  });
  console.log(`paused: data-motion=${running.attr}, infinite animations running: ${running.names.join(", ") || "none"}`);
  check(running.attr === "paused", 'a stored "paused" preference did not set html[data-motion="paused"]');
  check(running.names.length === 0, `Pause motion left infinite animations running: ${running.names.join(", ")}`);
  await close();
}

// 4. Duplicate ids (SplitText clones any id placed inside a Reveal heading onto every line).
for (const path of ["/", "/work/genie/", "/work/a-iep/", "/receipts/"]) {
  const { page, close } = await open(path);
  const dups = await page.evaluate(() => {
    const counts = {};
    document.querySelectorAll("[id]").forEach((el) => (counts[el.id] = (counts[el.id] ?? 0) + 1));
    return Object.entries(counts).filter(([, n]) => n > 1).map(([id, n]) => `${id} x${n}`);
  });
  console.log(`duplicate ids on ${path}: ${dups.join(", ") || "none"}`);
  check(dups.length === 0, `duplicate ids on ${path}: ${dups.join(", ")}`);
  await close();
}

// 5. /#about lands on the About chapter.
{
  const { page, close } = await open("/#about");
  const state = await page.evaluate(() => ({
    hash: location.hash,
    y: Math.round(window.scrollY),
    top: Math.round(document.getElementById("origin").getBoundingClientRect().top + window.scrollY),
  }));
  console.log(`/#about: hash ${state.hash}, scrollY ${state.y}, chapter top ${state.top}`);
  check(state.hash === "#origin" && Math.abs(state.y - state.top) <= 40, `/#about did not land on the About chapter (hash ${state.hash}, scrollY ${state.y}, chapter at ${state.top})`);
  await close();
}

// 6. Tour start moves focus into the HUD.
{
  const { page, close } = await open("/");
  await page.getByRole("button", { name: /I'm a founder/i }).first().focus();
  await page.keyboard.press("Enter");
  await sleep(SETTLE_MS);
  const inHud = await page.evaluate(() => Boolean(document.activeElement?.closest("[data-director-hud]")));
  console.log(`tour started from the keyboard: focus ${inHud ? "is" : "is not"} in the tour HUD`);
  check(inHud, "starting a tour from the keyboard dropped focus out of the page (not in the tour HUD)");
  await page.keyboard.press("Escape");
  await close();
}

await browser.close();
if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log("interactions ok");
