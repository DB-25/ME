import { mulberry32 } from "./formations/rng";

const SIZE = 512;
const MAX_LENGTH = 120_000;
const MAX_ELEMENTS = 2_000;
const FRAME_W = 4.4;
const FRAME_H = 3.4;
const Z_JITTER = 0.09;
const EDGE_RADIUS = 3;
const INTERIOR_KEEP = 0.35;
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
  root.setAttribute("viewBox", `0 0 ${SIZE} ${SIZE}`);
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

/**
 * Rasterise a model-drawn SVG and sample lit pixels into particle targets.
 * Strokes and edges are weighted over flat interiors. Never throws: null on failure.
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

    const lit = (x: number, y: number) => x >= 0 && y >= 0 && x < SIZE && y < SIZE && data[(y * SIZE + x) * 4 + 3] > 96;
    const px: number[] = [];
    const edge: boolean[] = [];
    let minX = SIZE;
    let minY = SIZE;
    let maxX = 0;
    let maxY = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        if (!lit(x, y)) continue;
        px.push(x, y);
        edge.push(!(lit(x - EDGE_RADIUS, y) && lit(x + EDGE_RADIUS, y) && lit(x, y - EDGE_RADIUS) && lit(x, y + EDGE_RADIUS)));
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    const n = edge.length;
    if (n < 8) return null;

    const bw = Math.max(8, maxX - minX);
    const bh = Math.max(8, maxY - minY);
    const scale = Math.min(FRAME_W / bw, FRAME_H / bh);
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const rand = mulberry32(99);
    const out = new Float32Array(count * 3);
    for (let i = 0; i < count; ) {
      const k = Math.floor(rand() * n);
      if (!edge[k] && rand() > INTERIOR_KEEP) continue;
      out[i * 3] = (px[k * 2] + rand() - cx) * scale;
      out[i * 3 + 1] = -(px[k * 2 + 1] + rand() - cy) * scale;
      out[i * 3 + 2] = (rand() - 0.5) * 2 * Z_JITTER;
      i++;
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
