import { chromium } from "playwright";
const b = await chromium.launch({ executablePath: process.env.HOME + "/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const bad = [];
p.on("response", r => { if (r.status() >= 400) bad.push(r.status() + " " + r.url()); });
p.on("pageerror", e => bad.push("pageerror " + e.message));
// Usage: BASE=http://localhost:4310 node scripts/check-export.mjs [slug ...]
const base = process.env.BASE || "http://localhost:4173";
const slugs = process.argv.slice(2).length ? process.argv.slice(2) : ["a-iep", "vct-scout"];
for (const u of ["/ME/", ...slugs.map((s) => `/ME/work/${s}/`)]) {
  await p.goto(base + u, { waitUntil: "networkidle" });
  await p.waitForTimeout(2500);
  await p.evaluate(async () => { for (let y=0;y<document.body.scrollHeight;y+=800){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,120)); } });
  await p.waitForTimeout(1500);
}
console.log(bad.join("\n") || "no errors");
await b.close();
