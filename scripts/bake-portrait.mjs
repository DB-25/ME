// Bake the hero portrait into compact particle data. The source photo never enters the repo.
//
// Usage: node scripts/bake-portrait.mjs <cutout.png> [--count=60000] [--out=public/signal/portrait.bin] [--preview=/path/preview.png]
//
// Input: RGBA PNG with a transparent background (background-removed half-body cutout).
//
// Output layout (little endian), see src/components/signal/formations/portrait.ts:
//   bytes 0..3    magic "SIG1"
//   bytes 4..7    uint32 N (point count)
//   bytes 8..11   float32 scale: world units = int16 / scale ... stored as int16 = round(world * 8192)
//   then N * 3 * int16   x, y, z   (world units * 8192, standard framing: figure height WORLD_HEIGHT, centered)
//   then N * 3 * uint8   r, g, b   (final particle color, already blended ~60% toward the brand palette)
// Points are i.i.d. samples, so any prefix of the file is an unbiased subset (mobile uses a prefix).
import sharp from "sharp";
import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);
const input = args.find((a) => !a.startsWith("--"));
const opt = Object.fromEntries(args.filter((a) => a.startsWith("--")).map((a) => a.replace(/^--/, "").split("=")));
if (!input) {
  console.error("usage: node scripts/bake-portrait.mjs <cutout.png> [--count=60000] [--out=...] [--preview=...]");
  process.exit(1);
}
const COUNT = Number(opt.count || 60000);
const OUT = opt.out || "public/signal/portrait.bin";

const WORLD_HEIGHT = 3.9;
const QUANT = 8192;
const BODY_DEPTH = 0.95;
const BULGE_RADIUS = 26;
const BRAND_BLEND = 0.6;

const UV_DEEP = [0.22, 0.15, 0.82];
const UV = [0.43, 0.35, 1.0];
const HOT = [0.74, 0.68, 1.0];

const { data: rgba, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width;
const H = info.height;
const N = W * H;

const A = new Float32Array(N);
const L = new Float32Array(N);
for (let i = 0; i < N; i++) {
  A[i] = rgba[i * 4 + 3] / 255;
  L[i] = (0.299 * rgba[i * 4] + 0.587 * rgba[i * 4 + 1] + 0.114 * rgba[i * 4 + 2]) / 255;
}

/** Sliding-window box blur, clamped edges. */
function boxBlur(src, r) {
  const tmp = new Float32Array(N);
  const out = new Float32Array(N);
  const norm = 1 / (2 * r + 1);
  for (let y = 0; y < H; y++) {
    let sum = 0;
    const row = y * W;
    for (let k = -r; k <= r; k++) sum += src[row + Math.min(W - 1, Math.max(0, k))];
    for (let x = 0; x < W; x++) {
      tmp[row + x] = sum * norm;
      sum += src[row + Math.min(W - 1, x + r + 1)] - src[row + Math.max(0, x - r)];
    }
  }
  for (let x = 0; x < W; x++) {
    let sum = 0;
    for (let k = -r; k <= r; k++) sum += tmp[Math.min(H - 1, Math.max(0, k)) * W + x];
    for (let y = 0; y < H; y++) {
      out[y * W + x] = sum * norm;
      sum += tmp[Math.min(H - 1, y + r + 1) * W + x] - tmp[Math.max(0, y - r) * W + x];
    }
  }
  return out;
}
const blur3 = (src, r) => boxBlur(boxBlur(boxBlur(src, r), r), r);

function sobel(src) {
  const out = new Float32Array(N);
  for (let y = 1; y < H - 1; y++) {
    for (let x = 1; x < W - 1; x++) {
      const i = y * W + x;
      const gx = src[i - W + 1] + 2 * src[i + 1] + src[i + W + 1] - src[i - W - 1] - 2 * src[i - 1] - src[i + W - 1];
      const gy = src[i + W - 1] + 2 * src[i + W] + src[i + W + 1] - src[i - W - 1] - 2 * src[i - W] - src[i - W + 1];
      out[i] = Math.hypot(gx, gy);
    }
  }
  return out;
}

function normalizeByPercentile(arr, pct) {
  const sample = [];
  for (let i = 0; i < N; i += 7) if (A[i] > 0.5) sample.push(arr[i]);
  sample.sort((a, b) => a - b);
  const p = sample[Math.floor(sample.length * pct)] || 1;
  for (let i = 0; i < N; i++) arr[i] = Math.min(1, arr[i] / p);
  return arr;
}

// Inside the silhouette, luminance outside it is replaced by the mean so the cutout border is not a false edge.
let meanL = 0;
let cnt = 0;
for (let i = 0; i < N; i++) if (A[i] > 0.5) { meanL += L[i]; cnt++; }
meanL /= Math.max(1, cnt);
const Lm = new Float32Array(N);
for (let i = 0; i < N; i++) Lm[i] = A[i] > 0.5 ? L[i] : meanL;

const L1 = boxBlur(Lm, 1);
const edge = normalizeByPercentile(sobel(L1), 0.96);
const sil = normalizeByPercentile(sobel(boxBlur(A, 1)), 0.9);
const Lb = boxBlur(Lm, 5);
const contrast = new Float32Array(N);
for (let i = 0; i < N; i++) contrast[i] = Math.abs(Lm[i] - Lb[i]);
normalizeByPercentile(contrast, 0.95);

// Body volume: blurred mask is 0.5 on the silhouette edge and approaches 1 deep inside.
const mask = new Float32Array(N);
for (let i = 0; i < N; i++) mask[i] = A[i] > 0.5 ? 1 : 0;
const bulge = blur3(mask, BULGE_RADIUS);
const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

const boxBlur16 = boxBlur(boxBlur(Lm, 14), 14);
const blob2 = (x, y, bx, by, sx, sy) => Math.exp(-(((x - bx) / sx) ** 2 + ((y - by) / sy) ** 2));
// Weights.
const cdf = new Float64Array(N);
let total = 0;
for (let i = 0; i < N; i++) {
  let w = 0;
  if (A[i] > 0.5) {
    const nx = (i % W) / W;
    const ny = ((i / W) | 0) / H;
    // Importance: the face, then the hand and phone, read first; the shirt gives texture.
    const head = blob2(nx, ny, 0.52, 0.1, 0.11, 0.075);
    const focus = 1 + 2.2 * blob2(nx, ny, 0.22, 0.2, 0.1, 0.075);
    const body = (0.14 + 0.4 * Math.pow(Lm[i], 1.5) + 1.4 * edge[i] + 0.9 * sil[i] + 0.2 * contrast[i]) * focus;
    // Face: stretch local contrast so lit planes are dense and shadowed features become gaps.
    const wide = boxBlur16[i];
    const loc = Math.min(1, Math.max(0, 0.5 + 3 * (Lm[i] - wide)));
    const face = (0.05 + 3.4 * loc * loc * loc + 1.6 * edge[i] + 0.9 * sil[i]) * 5.5;
    w = body * (1 - head) + face * head;
  }
  total += w;
  cdf[i] = total;
}

// bbox of the figure for centering.
let minX = W, maxX = 0, minY = H, maxY = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (A[y * W + x] > 0.5) {
  if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
}
const scale = WORLD_HEIGHT / (maxY - minY);
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;

function mulberry32(a) {
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = mulberry32(2026);
const blob = (x, y, bx, by, s) => Math.exp(-(((x - bx) / s) ** 2 + ((y - by) / s) ** 2));

const header = Buffer.alloc(12);
header.write("SIG1", 0, "ascii");
header.writeUInt32LE(COUNT, 4);
header.writeUInt32LE(QUANT, 8);
const pos = Buffer.alloc(COUNT * 6);
const col = Buffer.alloc(COUNT * 3);
const prev = opt.preview ? Buffer.alloc(W * H * 3) : null;
const side = opt.side ? Buffer.alloc(W * H * 3) : null;

for (let p = 0; p < COUNT; p++) {
  const target = rand() * total;
  let lo = 0, hi = N - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cdf[mid] < target) lo = mid + 1; else hi = mid;
  }
  const x = lo % W;
  const y = (lo / W) | 0;
  const fx = x + rand();
  const fy = y + rand();
  const nx = fx / W;
  const ny = fy / H;

  // Round the body: circular profile from the silhouette inward.
  const t = Math.min(1, Math.max(0, (bulge[lo] - 0.5) / 0.5));
  const dome = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
  let z = (dome - 0.45) * BODY_DEPTH;
  // Luminance relief: lighter reads slightly forward, so patterns and features gain texture.
  z += (Lb[lo] - 0.5) * 0.16 + (Lm[lo] - Lb[lo]) * 0.12;
  // The phone hand reaches toward the camera; the head leans a touch forward.
  z += 0.42 * blob(nx, ny, 0.22, 0.2, 0.17) + 0.16 * blob(nx, ny, 0.56, 0.1, 0.16);
  z += (rand() - 0.5) * 0.04;

  const wx = (fx - cx) * scale;
  const wy = -(fy - cy) * scale;
  pos.writeInt16LE(Math.round(wx * QUANT), p * 6);
  pos.writeInt16LE(Math.round(wy * QUANT), p * 6 + 2);
  pos.writeInt16LE(Math.round(z * QUANT), p * 6 + 4);

  // Color: source color boosted slightly, pulled ~60% toward the ultraviolet ramp by luminance.
  const headW = blob2(nx, ny, 0.52, 0.1, 0.11, 0.075);
  const stretched = Math.min(1, Math.max(0, 0.5 + 3 * (Lm[lo] - boxBlur16[lo])));
  const l = Lm[lo] * (1 - headW) + stretched * headW;
  const ramp = Math.pow(l, 0.75);
  const pal = ramp < 0.6
    ? UV_DEEP.map((c, k) => c + (UV[k] - c) * (ramp / 0.6))
    : UV.map((c, k) => c + (HOT[k] - c) * ((ramp - 0.6) / 0.4) * 0.7);
  for (let k = 0; k < 3; k++) {
    const src = rgba[lo * 4 + k] / 255;
    const boosted = Math.min(1, src * 1.15 + 0.05);
    // The face carries ~5x more points per area, so each of its particles is dimmed to keep the total even.
    col[p * 3 + k] = Math.round(255 * (boosted * (1 - BRAND_BLEND) + pal[k] * BRAND_BLEND) / (1 + 1.4 * headW));
  }
  if (prev) {
    const o = (Math.min(H - 1, Math.floor(fy)) * W + Math.min(W - 1, Math.floor(fx))) * 3;
    for (let k = 0; k < 3; k++) prev[o + k] = Math.min(255, prev[o + k] + col[p * 3 + k] * 0.9);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([header, pos, col]));
console.log(`baked ${COUNT} points from ${W}x${H} -> ${OUT} (${((12 + COUNT * 9) / 1024).toFixed(0)} KB)`);

if (prev) {
  await sharp(prev, { raw: { width: W, height: H, channels: 3 } })
    .blur(0.8)
    .modulate({ brightness: 1.6 })
    .png()
    .toFile(opt.preview);
  console.log("preview ->", opt.preview);
  await sharp(opt.preview).extract({ left: 200, top: 0, width: 300, height: 330 }).resize(900, 990, { kernel: "nearest" }).toFile(opt.preview.replace(/\.png$/, "-head.png"));
}
