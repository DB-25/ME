import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:4174";
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: {width:1440,height:900} });
const p = await ctx.newPage();
const errs=[]; p.on("pageerror", e=>errs.push(e.message));
await p.goto(BASE + "/", { waitUntil: "load" });
await p.waitForTimeout(6000);
const state = () => p.evaluate(() => ({ y: Math.round(scrollY), chapter: document.querySelector("header p")?.textContent?.trim(), lenis: !!window.lenis }));
const tops = () => p.evaluate(() => Object.fromEntries([...document.querySelectorAll("[data-chapter]")].map(e => [e.dataset.chapter, Math.round(e.getBoundingClientRect().top + scrollY)])));
console.log("tops", JSON.stringify(await tops()), await state());
for (const id of ["work","director","contact"]) {
  await p.click(`nav[aria-label=Primary] a[href="#${id}"]`);
  await p.waitForTimeout(3000);
  const t = await tops();
  console.log("nav ->", id, JSON.stringify(await state()), "target top", t[id]);
}
for (const id of ["origin","impact","human"]) {
  await p.click(`nav[aria-label=Chapters] a[href="#${id}"]`);
  await p.waitForTimeout(3200);
  const t = await tops();
  console.log("rail ->", id, JSON.stringify(await state()), "target top", t[id]);
}
// Back link from a case study
await p.goto(BASE + "/work/a-iep/", { waitUntil: "load" });
await p.waitForTimeout(3000);
await p.click(".cs-nav-back");
await p.waitForTimeout(4500);
const t = await tops();
console.log("back ->", JSON.stringify(await state()), "work top", t.work, "url", p.url());
// Click a work card then back via browser
await p.goto(BASE + "/#work", { waitUntil: "load" });
await p.waitForTimeout(5500);
console.log("direct /#work load", JSON.stringify(await state()), "work top", (await tops()).work);
console.log("errors", errs);
await b.close();
