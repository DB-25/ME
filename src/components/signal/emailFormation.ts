import { setDock } from "./docks";
import { gauss, mulberry32 } from "./formations/rng";
import { BASE_VISIBLE_H } from "./view";

/**
 * The Contact finale: the field collapses into a frame around the real email address. The address itself stays DOM
 * (selectable, a real link); the particles trace a thin band just outside its letterforms, so the glyphs read as
 * ink inside a ring of light and no particle ever sits on a letter. Glyph positions come from the rendered text
 * (one inline-block per character, as EmailLink lays it out), measured with offset geometry so the entrance
 * animation's transforms never skew them, then rasterised on a 2D canvas and sampled as points.
 */

const LINK_SELECTOR = "#contact a[href^='mailto:']";
const GLYPH_SELECTOR = "[data-ch]";
/** Band outside the letters, in em: starts a hair away from the glyph edge and ends a little further out. */
const BAND_INNER_EM = 0.03;
const BAND_OUTER_EM = 0.062;
const BAND_MIN_INNER_PX = 1.2;
const BAND_MIN_OUTER_PX = 3;
/** Raster resolution: letters are rasterised at least this tall so a phone's small address still resolves. */
const RASTER_TARGET_FONT_PX = 150;
const RASTER_MAX_SCALE = 4;
const PAD_PX = 16;
const ALPHA_LIT = 110;
const DUST_SHARE = 0.012;
const DUST_X_SHARE = 0.22;
const DUST_Y_EM = 0.8;
const Z_JITTER = 0.006;
const MIN_PIXELS = 64;

type Glyph = { ch: string; x: number };
type EmailGlyphs = {
  glyphs: Glyph[];
  font: string;
  fontSize: number;
  baseline: number;
  left: number;
  right: number;
  top: number;
  bottom: number;
  sig: string;
};

let current: EmailGlyphs | null = null;
/** Bumped whenever a measure finds the address somewhere new (resize, font swap, layout shift). */
export let emailVersion = 0;

function docPos(el: HTMLElement): { x: number; y: number } {
  let x = 0;
  let y = 0;
  for (let e: HTMLElement | null = el; e; e = e.offsetParent as HTMLElement | null) {
    x += e.offsetLeft;
    y += e.offsetTop;
  }
  return { x, y };
}

function measureGlyphs(): EmailGlyphs | null {
  const link = document.querySelector<HTMLElement>(LINK_SELECTOR);
  if (!link) return null;
  const spans = Array.from(link.querySelectorAll<HTMLElement>(GLYPH_SELECTOR));
  if (spans.length === 0) return null;
  const style = getComputedStyle(spans[0]);
  const fontSize = parseFloat(style.fontSize);
  if (!fontSize || !document.fonts?.check?.(`${style.fontWeight} ${style.fontSize} ${style.fontFamily}`)) return null;
  const font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`;

  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return null;
  ctx.font = font;
  const m = ctx.measureText("Hg");
  const ascent = m.fontBoundingBoxAscent ?? m.actualBoundingBoxAscent;
  const descent = m.fontBoundingBoxDescent ?? m.actualBoundingBoxDescent;

  const first = docPos(spans[0]);
  const glyphs: Glyph[] = [];
  let right = 0;
  for (const span of spans) {
    const p = docPos(span);
    glyphs.push({ ch: span.textContent ?? "", x: p.x });
    right = Math.max(right, p.x + span.offsetWidth);
  }
  const height = spans[0].offsetHeight;
  const baseline = first.y + (height - (ascent + descent)) / 2 + ascent;
  const out: EmailGlyphs = {
    glyphs,
    font,
    fontSize,
    baseline,
    left: first.x,
    right,
    top: first.y,
    bottom: first.y + height,
    sig: "",
  };
  out.sig = [out.left, out.right, out.top, out.bottom, fontSize, glyphs.length].map((n) => Math.round(n)).join(",");
  return out;
}

/** Re-measures the address. Cheap when nothing moved; publishes its centre as the Contact dock either way. */
export function refreshEmail(): void {
  const before = current;
  const next = measureGlyphs();
  if (!next) {
    if (current) emailVersion++;
    current = null;
    setDock("contact", null);
    return;
  }
  if (!current || current.sig !== next.sig) emailVersion++;
  current = next;
  setDock("contact", {
    cx: (next.left + next.right) / 2,
    cy: (next.top + next.bottom) / 2,
    rx: (next.right - next.left) / 2,
    ry: (next.bottom - next.top) / 2,
  });
  // The address can move without its glyphs changing (copy above it reflows): tell a field that renders on demand.
  if (!before || before.sig !== next.sig || before.top !== next.top || before.left !== next.left) moved.forEach((fn) => fn());
}

const moved = new Set<() => void>();
/** Calls `fn` whenever a measure finds the address somewhere else. Returns an unsubscribe. */
export function onEmailMoved(fn: () => void): () => void {
  moved.add(fn);
  return () => moved.delete(fn);
}

export const hasEmail = () => current !== null;

/**
 * Particle targets for the band around the address, centred on the address box and expressed in world units at the
 * base camera distance (the field scales them to the live camera and carries them to the box's screen position).
 */
export function buildEmailPoints(count: number, viewportHeight: number): Float32Array | null {
  const g = current;
  if (!g) return null;
  const scale = Math.min(RASTER_MAX_SCALE, Math.max(1, RASTER_TARGET_FONT_PX / g.fontSize));
  const w = Math.ceil((g.right - g.left + PAD_PX * 2) * scale);
  const h = Math.ceil((g.bottom - g.top + PAD_PX * 2) * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.setTransform(scale, 0, 0, scale, (PAD_PX - g.left) * scale, (PAD_PX - g.top) * scale);
  ctx.font = g.font;
  ctx.textBaseline = "alphabetic";
  ctx.lineJoin = "round";
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  const inner = Math.max(BAND_MIN_INNER_PX, g.fontSize * BAND_INNER_EM);
  const outer = Math.max(BAND_MIN_OUTER_PX, g.fontSize * BAND_OUTER_EM);
  // Everything within `outer` of a glyph, then carve out everything within `inner` (and the glyph itself).
  ctx.lineWidth = outer * 2;
  for (const c of g.glyphs) ctx.strokeText(c.ch, c.x, g.baseline);
  ctx.globalCompositeOperation = "destination-out";
  ctx.lineWidth = inner * 2;
  for (const c of g.glyphs) {
    ctx.strokeText(c.ch, c.x, g.baseline);
    ctx.fillText(c.ch, c.x, g.baseline);
  }

  const data = ctx.getImageData(0, 0, w, h).data;
  const lit: number[] = [];
  for (let i = 0; i < w * h; i++) if (data[i * 4 + 3] > ALPHA_LIT) lit.push(i);
  if (lit.length < MIN_PIXELS) return null;

  const cx = (g.left + g.right) / 2;
  const cy = (g.top + g.bottom) / 2;
  const unit = BASE_VISIBLE_H / viewportHeight;
  const rand = mulberry32(2026);
  const out = new Float32Array(count * 3);
  const dustX = (g.right - g.left) * DUST_X_SHARE;
  const dustY = g.fontSize * DUST_Y_EM;
  for (let i = 0; i < count; i++) {
    let dx: number;
    let dy: number;
    if (rand() < DUST_SHARE) {
      dx = gauss(rand) * dustX;
      dy = gauss(rand) * dustY;
    } else {
      const px = lit[Math.floor(rand() * lit.length)];
      const x = (px % w) + rand();
      const y = Math.floor(px / w) + rand();
      dx = x / scale - PAD_PX + g.left - cx;
      dy = y / scale - PAD_PX + g.top - cy;
    }
    out[i * 3] = dx * unit;
    out[i * 3 + 1] = -dy * unit;
    out[i * 3 + 2] = (rand() - 0.5) * Z_JITTER;
  }
  return out;
}
