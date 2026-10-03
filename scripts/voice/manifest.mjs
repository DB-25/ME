#!/usr/bin/env node
/**
 * Writes public/voice/manifest.json from the recordings that exist.
 *
 *   node scripts/voice/manifest.mjs
 *
 * The site only plays a line if its id is in the manifest, so it never asks for
 * a file that is not there. With no recordings the manifest is not written and
 * the Voice toggle stays hidden. Lines in lines.json that have no recording yet
 * are listed so nothing is missed by accident.
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "../..");
const dir = path.join(ROOT, "public/voice");
const ids = fs.existsSync(dir)
  ? fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".mp3"))
      .map((f) => f.slice(0, -4))
      .sort()
  : [];

if (!ids.length) {
  console.log("no recordings in public/voice, manifest not written");
  process.exit(0);
}

fs.writeFileSync(path.join(dir, "manifest.json"), `${JSON.stringify({ ids }, null, 2)}\n`);
console.log(`${ids.length} recordings -> public/voice/manifest.json`);

const linesFile = path.join(ROOT, "scripts/voice/lines.json");
if (fs.existsSync(linesFile)) {
  const lines = JSON.parse(fs.readFileSync(linesFile, "utf8"));
  const missing = lines.filter((l) => !ids.includes(l.id));
  if (missing.length) {
    console.log(`${missing.length} of ${lines.length} lines have no recording yet:`);
    for (const l of missing) console.log(`  ${l.id}  ${l.text}`);
  }
}
