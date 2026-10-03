import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:4174";
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const ctx = await b.newContext({ viewport: {width:1440,height:900} });
const p = await ctx.newPage();
await p.goto(BASE + (process.env.PATHNAME || "/"), { waitUntil: "load" });
await p.waitForTimeout(5500);
const seen = [];
for (let i = 0; i < 140; i++) {
  await p.keyboard.press("Tab");
  await p.waitForTimeout(120);
  const info = await p.evaluate(() => {
    const e = document.activeElement; if (!e || e === document.body) return { body: true };
    const r = e.getBoundingClientRect(); const cs = getComputedStyle(e);
    let op = 1; for (let n = e; n && n !== document.documentElement; n = n.parentElement) op *= parseFloat(getComputedStyle(n).opacity);
    const sec = e.closest("[data-chapter]")?.getAttribute("data-chapter");
    return { tag: e.tagName.toLowerCase(), t: (e.getAttribute("aria-label") || e.textContent || "").trim().replace(/\s+/g," ").slice(0,40), href: e.getAttribute("href"), inView: r.bottom > 0 && r.top < innerHeight && r.right>0 && r.left<innerWidth, op: +op.toFixed(2), outline: cs.outlineStyle + " " + cs.outlineWidth + " " + cs.outlineColor, sec, scrollY: Math.round(scrollY), w: Math.round(r.width), h: Math.round(r.height) };
  });
  if (info.body) { console.log(i, "BODY (end of cycle)"); break; }
  seen.push(info);
  const flags = [];
  if (!info.inView) flags.push("OFFSCREEN");
  if (info.op < 0.5) flags.push("HIDDEN op=" + info.op);
  if (/none/.test(info.outline) || info.outline.startsWith("none")) flags.push("NO-OUTLINE");
  console.log(i, info.sec || "-", info.tag, JSON.stringify(info.t), info.href || "", flags.join(" "));
}
await b.close();
