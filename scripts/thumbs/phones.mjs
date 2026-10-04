// Build a "phones" hero for projects whose UI is a mobile app: crop each screen from a still, round its corners,
// add a hairline edge, and lay them side by side on transparency. The thumbnail template then shows it unframed.
// Usage: node scripts/thumbs/phones.mjs <slug>
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { THUMBS } from "./config.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const t = THUMBS.find((x) => x.slug === process.argv[2]);
if (!t?.phones) throw new Error(`no phones config for ${process.argv[2]}`);
const { source, screens, gap = 44, radius = 30 } = t.phones;
const [, , w, h] = screens[0];
const tiles = await Promise.all(
  screens.map(async ([x, y]) => {
    const mask = Buffer.from(`<svg width="${w}" height="${h}"><rect width="${w}" height="${h}" rx="${radius}" ry="${radius}"/></svg>`);
    const edge = Buffer.from(
      `<svg width="${w}" height="${h}"><rect x="1" y="1" width="${w - 2}" height="${h - 2}" rx="${radius - 1}" ry="${radius - 1}" fill="none" stroke="rgb(201,190,255)" stroke-opacity="0.35" stroke-width="2"/></svg>`,
    );
    return sharp(path.join(here, source))
      .extract({ left: x, top: y, width: w, height: h })
      .composite([{ input: mask, blend: "dest-in" }, { input: edge }])
      .png()
      .toBuffer();
  }),
);
const W = screens.length * w + (screens.length - 1) * gap;
await sharp({ create: { width: W, height: h, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
  .composite(tiles.map((input, i) => ({ input, left: i * (w + gap), top: 0 })))
  .png()
  .toFile(path.join(here, "heroes", `${t.slug}.png`));
console.log("hero", t.slug, `${W}x${h}`, "(phones)");
