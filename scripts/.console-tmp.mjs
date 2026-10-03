import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3102";
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const slugs = process.env.SLUGS.split(",");
for (const [label, vp, mobile] of [["desktop",{width:1440,height:900},false],["mobile",{width:390,height:844},true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, reducedMotion: process.env.RM ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  const out = [];
  p.on("console", m => { if (["error","warning"].includes(m.type())) out.push(`${m.type()}: ${m.text().slice(0,300)}`); });
  p.on("pageerror", e => out.push("pageerror " + e.message));
  p.on("response", r => { if (r.status() >= 400) out.push(r.status() + " " + r.url()); });
  p.on("requestfailed", r => out.push("reqfailed " + r.url() + " " + r.failure()?.errorText));
  for (const u of ["/", ...slugs.map(s => `/work/${s}/`)]) {
    out.length = 0;
    await p.goto(BASE + u, { waitUntil: "load" });
    await p.waitForTimeout(4500);
    await p.evaluate(async () => { for (let y=0;y<document.documentElement.scrollHeight;y+=700){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,90)); } });
    await p.waitForTimeout(800);
    console.log(label, u, out.length ? "\n  " + [...new Set(out)].join("\n  ") : "clean");
  }
  await ctx.close();
}
await b.close();
