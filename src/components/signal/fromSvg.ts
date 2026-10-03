import { mulberry32 } from "./formations/rng";

/** Drawings are authored in a 512 viewBox and rasterised at 2x so strokes resolve to a clean centerline. */
const VIEWBOX = 512;
const RASTER_SCALE = 2;
const SIZE = VIEWBOX * RASTER_SCALE;
const MAX_LENGTH = 120_000;
const MAX_ELEMENTS = 2_000;
const FRAME_W = 4.4;
const FRAME_H = 3.4;
const Z_JITTER = 0.008;
const XY_JITTER = 0.15;
const ALPHA_LIT = 160;
/** Distance transform: a pixel's distance to the nearest unlit pixel, in raster pixels. */
const CHAMFER_AXIS = 1;
const CHAMFER_DIAG = 1.4142;
/** Local widest half-width (raster px) below which a region counts as a stroke rather than a fill. */
const STROKE_MAX_HALF = 22;
const WINDOW = 14;
/** A stroke keeps only pixels this close to its own centerline depth (smaller = thinner line). */
const CORE_SHARE = 0.72;
/** Fills keep an outline this many raster px deep, plus a sparse interior. */
const FILL_EDGE_BAND = 3;
const INTERIOR_KEEP = 0.08;
const LOAD_TIMEOUT_MS = 4_000;

const ALLOWED_TAGS = new Set(["svg", "g", "path", "circle", "rect", "ellipse", "line", "polyline", "polygon"]);
const ALLOWED_ATTRS = new Set([
  "d", "cx", "cy", "r", "rx", "ry", "x", "y", "x1", "y1", "x2", "y2", "width", "height", "points",
  "fill", "stroke", "stroke-width", "stroke-linecap", "stroke-linejoin", "stroke-miterlimit",
  "stroke-dasharray", "stroke-dashoffset", "opacity", "fill-opacity", "stroke-opacity", "fill-rule",
  "clip-rule", "transform",
]);
const COLOR_RE = /^(none|currentcolor|#[0-9a-f]{3,8}|[a-z]{3,20}|rgba?\([\d\s.,%/]+\)|hsla?\([\d\s.,%/deg]+\))$/i;
const PAINT_ATTRS = new Set(["fill", "stroke"]);
const NUMERIC_RE = /^[\d\s.,\-+eE%a-zA-Z()]*$/;

/** Returns a clean SVG string, or null when the input is unusable. */
export function sanitizeSvg(svg: string): string | null {
  if (typeof DOMParser === "undefined" || !svg || svg.length > MAX_LENGTH) return null;
  const doc = new DOMParser().parseFromString(svg, "image/svg+xml");
  const root = doc.documentElement;
  if (!root || root.nodeName.toLowerCase() !== "svg" || doc.querySelector("parsererror")) return null;

  let elements = 0;
  const clean = (el: Element): boolean => {
    if (++elements > MAX_ELEMENTS) return false;
    for (const attr of Array.from(el.attributes)) {
      const name = attr.name.toLowerCase();
      const value = attr.value.trim();
      const bad =
        !ALLOWED_ATTRS.has(name) ||
        /url\(|javascript:|data:|expression\(/i.test(value) ||
        (PAINT_ATTRS.has(name) ? !COLOR_RE.test(value) : !NUMERIC_RE.test(value));
      if (bad) el.removeAttribute(attr.name);
    }
    for (const child of Array.from(el.children)) {
      if (!ALLOWED_TAGS.has(child.nodeName.toLowerCase())) {
        child.remove();
        continue;
      }
      if (!clean(child)) return false;
    }
    // Text nodes are not drawable here; drop them so no <text>-like content sneaks through.
    for (const node of Array.from(el.childNodes)) if (node.nodeType !== 1) node.remove();
    return true;
  };
  if (!clean(root)) return null;

  for (const attr of Array.from(root.attributes)) root.removeAttribute(attr.name);
  root.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  root.setAttribute("viewBox", `0 0 ${VIEWBOX} ${VIEWBOX}`);
  root.setAttribute("width", String(SIZE));
  root.setAttribute("height", String(SIZE));
  return new XMLSerializer().serializeToString(root);
}

function loadImage(markup: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(new Blob([markup], { type: "image/svg+xml;charset=utf-8" }));
    const img = new Image();
    const done = (value: HTMLImageElement | null) => {
      window.clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(value);
    };
    const timer = window.setTimeout(() => done(null), LOAD_TIMEOUT_MS);
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = url;
  });
}

/** Two-pass chamfer distance from each lit pixel to the nearest unlit one (0 outside). */
function distanceToEdge(mask: Uint8Array): Float32Array {
  const d = new Float32Array(SIZE * SIZE);
  const far = SIZE;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      if (!mask[i]) continue;
      const l = x > 0 ? d[i - 1] : 0;
      const u = y > 0 ? d[i - SIZE] : 0;
      const ul = x > 0 && y > 0 ? d[i - SIZE - 1] : 0;
      const ur = y > 0 && x < SIZE - 1 ? d[i - SIZE + 1] : 0;
      d[i] = Math.min(far, l + CHAMFER_AXIS, u + CHAMFER_AXIS, ul + CHAMFER_DIAG, ur + CHAMFER_DIAG);
    }
  }
  for (let y = SIZE - 1; y >= 0; y--) {
    for (let x = SIZE - 1; x >= 0; x--) {
      const i = y * SIZE + x;
      if (!mask[i]) continue;
      const r = x < SIZE - 1 ? d[i + 1] : 0;
      const b = y < SIZE - 1 ? d[i + SIZE] : 0;
      const br = x < SIZE - 1 && y < SIZE - 1 ? d[i + SIZE + 1] : 0;
      const bl = x > 0 && y < SIZE - 1 ? d[i + SIZE - 1] : 0;
      d[i] = Math.min(d[i], r + CHAMFER_AXIS, b + CHAMFER_AXIS, br + CHAMFER_DIAG, bl + CHAMFER_DIAG);
    }
  }
  return d;
}

/** Separable max filter: the deepest point within WINDOW px, i.e. the half-width of the stroke or fill here. */
function windowMax(src: Float32Array): Float32Array {
  const tmp = new Float32Array(src.length);
  const out = new Float32Array(src.length);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let m = 0;
      for (let k = Math.max(0, x - WINDOW); k <= Math.min(SIZE - 1, x + WINDOW); k++) m = Math.max(m, src[y * SIZE + k]);
      tmp[y * SIZE + x] = m;
    }
  }
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let m = 0;
      for (let k = Math.max(0, y - WINDOW); k <= Math.min(SIZE - 1, y + WINDOW); k++) m = Math.max(m, tmp[k * SIZE + x]);
      out[y * SIZE + x] = m;
    }
  }
  return out;
}

/**
 * Rasterise a model-drawn SVG at 2x and sample particle targets along stroke centerlines and fill
 * outlines, so the field draws precise line art rather than a blurred fill. Never throws: null on failure.
 */
export async function sampleSvg(svg: string, count: number): Promise<Float32Array | null> {
  try {
    const markup = sanitizeSvg(svg);
    if (!markup) return null;
    const img = await loadImage(markup);
    if (!img) return null;

    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, SIZE, SIZE);
    const data = ctx.getImageData(0, 0, SIZE, SIZE).data;

    const mask = new Uint8Array(SIZE * SIZE);
    for (let i = 0; i < mask.length; i++) mask[i] = data[i * 4 + 3] > ALPHA_LIT ? 1 : 0;
    const depth = distanceToEdge(mask);
    const reach = windowMax(depth);

    const px: number[] = [];
    let minX = SIZE;
    let minY = SIZE;
    let maxX = 0;
    let maxY = 0;
    const rand0 = mulberry32(7);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = y * SIZE + x;
        if (!mask[i]) continue;
        const d = depth[i];
        const local = reach[i];
        // Thin stroke: keep the centerline band. Fill: keep the outline, and a few interior points.
        const keep = local <= STROKE_MAX_HALF ? d >= local * CORE_SHARE : d <= FILL_EDGE_BAND || rand0() < INTERIOR_KEEP;
        if (!keep) continue;
        px.push(x, y);
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const n = px.length / 2;
    if (n < 8) return null;

    const bw = Math.max(8, maxX - minX);
    const bh = Math.max(8, maxY - minY);
    const scale = Math.min(FRAME_W / bw, FRAME_H / bh);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rand = mulberry32(99);
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const k = Math.floor(rand() * n);
      out[i * 3] = (px[k * 2] + 0.5 + (rand() - 0.5) * XY_JITTER - cx) * scale;
      out[i * 3 + 1] = -(px[k * 2 + 1] + 0.5 + (rand() - 0.5) * XY_JITTER - cy) * scale;
      out[i * 3 + 2] = (rand() - 0.5) * 2 * Z_JITTER;
    }
    return out;
  } catch {
    return null;
  }
}

/** Convenience: sample a single path `d` (512x512 space) drawn as a bold stroke. */
export function sampleSvgPath(d: string, count: number, strokeWidth = 8): Promise<Float32Array | null> {
  const safe = d.replace(/[^0-9a-zA-Z\s.,\-+]/g, "");
  return sampleSvg(
    `<svg viewBox="0 0 512 512"><path d="${safe}" fill="none" stroke="#fff" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    count,
  );
}
