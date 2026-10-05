// Checks the built export (out/) for the things that break quietly: a sitemap that lists URLs which do not exist,
// a robots.txt that points at the wrong sitemap, a missing 404 page, missing structured data or canonical, and share
// metadata that falls back to the home page's card (every route needs its own og:url equal to its canonical, an og:image
// and matching twitter title; the 404 needs exactly one robots tag).
// Usage: BASE_PATH=/ME SITE_URL=https://db-25.github.io/ME node scripts/ci/verify-export.mjs [outDir]
import fs from "node:fs";
import path from "node:path";

const out = path.resolve(process.argv[2] ?? "out");
const basePath = process.env.BASE_PATH ?? "";
const read = (rel) => fs.readFileSync(path.join(out, rel), "utf8");
const failures = [];
const check = (ok, message) => ok || failures.push(message);

const sitemap = read("sitemap.xml");
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
check(locs.length > 1, "sitemap.xml lists no URLs");
for (const loc of locs) {
  const { pathname } = new URL(loc);
  check(!pathname.includes(`${basePath}${basePath}/`) || basePath === "", `sitemap URL repeats the base path: ${loc}`);
  check(pathname.startsWith(basePath), `sitemap URL is outside the base path: ${loc}`);
  const rel = pathname.slice(basePath.length).replace(/^\/+/, "");
  const file = path.join(out, rel, rel.endsWith(".html") ? "" : "index.html");
  check(fs.existsSync(file), `sitemap URL has no page in out/: ${loc} (looked for ${path.relative(out, file)})`);
}

const robots = read("robots.txt");
const sitemapLine = robots.match(/^Sitemap:\s*(\S+)/im)?.[1];
check(Boolean(sitemapLine) && locs[0].startsWith(sitemapLine.replace(/sitemap\.xml$/, "")), `robots.txt Sitemap does not match the sitemap host: ${sitemapLine}`);

check(fs.existsSync(path.join(out, "404.html")), "404.html is missing");
check(/Nothing at this/.test(read("404.html")), "404.html is not the designed not-found page");

const metaContent = (html, attr, name) => html.match(new RegExp(`<meta ${attr}="${name}" content="([^"]*)"`))?.[1];
check((read("404.html").match(/<meta name="robots"/g) ?? []).length === 1, "404.html must carry exactly one robots meta tag");
for (const loc of locs) {
  const rel = new URL(loc).pathname.slice(basePath.length).replace(/^\/+/, "");
  const file = path.join(rel, "index.html");
  if (!fs.existsSync(path.join(out, file))) continue; // already reported above
  const page = read(file);
  const label = rel || "home";
  check(metaContent(page, "property", "og:url") === loc, `${label}: og:url is ${metaContent(page, "property", "og:url")}, expected the canonical ${loc}`);
  check(Boolean(metaContent(page, "property", "og:image")), `${label}: no og:image`);
  check(Boolean(metaContent(page, "name", "twitter:image")), `${label}: no twitter:image`);
  check(metaContent(page, "property", "og:title") === metaContent(page, "name", "twitter:title"), `${label}: twitter:title differs from og:title`);
}

const home = read("index.html");
check(/<link rel="canonical" href="[^"]+"/.test(home), "home has no canonical link");
check(/"@type":"Person"/.test(home), "home has no Person JSON-LD");
for (const loc of locs.filter((l) => /\/work\/.+/.test(l))) {
  const rel = new URL(loc).pathname.slice(basePath.length).replace(/^\/+/, "");
  if (!fs.existsSync(path.join(out, rel, "index.html"))) continue; // already reported above
  const page = read(path.join(rel, "index.html"));
  check(/"@type":"CreativeWork"/.test(page), `${rel} has no CreativeWork JSON-LD`);
  check(page.includes(`<link rel="canonical" href="${loc}"`), `${rel} canonical does not equal its sitemap URL`);
}

if (failures.length) {
  console.error(failures.map((f) => `FAIL ${f}`).join("\n"));
  process.exit(1);
}
console.log(`export ok: ${locs.length} sitemap URLs resolve, robots, 404, canonical and JSON-LD present`);
