// Pull each hero frame at full 1920x1080 from .brag/<slug>/brag.mp4 and crop it to the UI window.
// Usage: node scripts/thumbs/extract.mjs [slug]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { THUMBS } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const out = path.join(here, "heroes");
fs.mkdirSync(out, { recursive: true });
const only = process.argv[2];

for (const t of THUMBS.filter((x) => !only || x.slug === only)) {
  const dir = path.join(root, ".brag", t.slug);
  // A film being re-rendered may briefly only have its previous cut: the UI window is the same in both.
  const film = ["brag.mp4", "brag-v1.mp4"].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
  const still = t.source && path.join(here, t.source);
  const input = still ? ["-i", still] : ["-ss", String(t.frame), "-i", film];
  if (!still && !film) throw new Error(`no film for ${t.slug}`);
  for (const [crop, name] of [[t.crop, t.slug], [t.crop43, `${t.slug}-43`]]) {
    if (!crop) continue;
    const [x, y, w, h] = crop;
    execFileSync("ffmpeg", ["-loglevel", "error", "-y", ...input, "-frames:v", "1", "-vf", `crop=${w}:${h}:${x}:${y}`, path.join(out, `${name}.png`)], { stdio: "inherit" });
    console.log("hero", name, `${w}x${h}`, still ? "(still)" : "");
  }
}
