import { chromium } from "playwright";
import { AxeBuilder } from "@axe-core/playwright";
const BASE = process.env.BASE || "http://localhost:4174";
const exe = process.env.HOME + "/Library/Caches/ms-playwright/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing";
const b = await chromium.launch({ executablePath: exe, args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const pages = (process.env.PAGES || "/,/work/a-iep/,/work/vct-scout/").split(",");
for (const [label, vp, mobile] of [["desktop",{width:1440,height:900},false],["mobile",{width:390,height:844},true]]) {
  const ctx = await b.newContext({ viewport: vp, isMobile: mobile, hasTouch: mobile, reducedMotion: process.env.RM ? "reduce" : "no-preference" });
  const p = await ctx.newPage();
  for (const u of pages) {
    await p.goto(BASE + u, { waitUntil: "networkidle" });
    await p.waitForTimeout(4500);
    await p.evaluate(async () => { for (let y=0;y<document.documentElement.scrollHeight;y+=600){ window.scrollTo(0,y); await new Promise(r=>setTimeout(r,80)); } window.scrollTo(0,0); });
    await p.waitForTimeout(1200);
    const r = await new AxeBuilder({ page: p }).withTags(["wcag2a","wcag2aa","wcag21a","wcag21aa","best-practice"]).analyze();
    console.log(`== ${label} ${u}: ${r.violations.length} violations`);
    for (const v of r.violations) {
      console.log(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length})`);
      for (const n of v.nodes.slice(0,5)) console.log("     ", n.target.join(" "), "|", (n.failureSummary||"").split("\n")[1]?.slice(0,140));
    }
  }
  await ctx.close();
}
await b.close();
