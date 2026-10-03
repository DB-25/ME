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
  const [x, y, w, h] = t.crop;
  // A film being re-rendered may briefly only have its previous cut: the UI window is the same in both.
  const dir = path.join(root, ".brag", t.slug);
  const src = ["brag.mp4", "brag-v1.mp4"].map((f) => path.join(dir, f)).find((f) => fs.existsSync(f));
  if (!src) throw new Error(`no film for ${t.slug}`);
  execFileSync(
    "ffmpeg",
    ["-loglevel", "error", "-y", "-ss", String(t.frame), "-i", src,
     "-frames:v", "1", "-vf", `crop=${w}:${h}:${x}:${y}`, path.join(out, `${t.slug}.png`)],
    { stdio: "inherit" },
  );
  console.log("hero", t.slug, `${w}x${h}`);
}
