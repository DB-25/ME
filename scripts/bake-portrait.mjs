// Bake the hero portrait into compact particle data. The source photo never enters the repo.
//
// Usage: node scripts/bake-portrait.mjs <cutout.png> [--count=60000] [--out=public/signal/portrait.bin] [--preview=/path/preview.png]
//
// Input: RGBA PNG with a transparent background (background-removed half-body cutout).
//
// Output layout (little endian), see src/components/signal/formations/portrait.ts:
//   bytes 0..3    magic "SIG4"
//   bytes 4..7    uint32 N (point count)
//   bytes 8..11   uint32 QUANT (positions are int16 = round(world * QUANT))
//   then N * 3 * int16   x, y, z   (standard framing: figure height WORLD_HEIGHT, centered)
//   then N * 5 * uint8   r, g, b, t, c   (t = tone 0..255, mapped by the shader to alpha and size; c = grid cell size relative to the torso, 255 = torso)
// Halftone approach: particles sit on a jittered grid (face ~2.2x finer than torso), tone lives in brightness and size.
// The file is shuffled, so any prefix is an unbiased random subset (mobile uses a prefix).
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
const BODY_DEPTH = 0.9;
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

// Head region as fractions of the frame: face bbox roughly x 330-600, y 60-380 of 800x1049, plus margin.
const HEAD = { cx: 0.581, cy: 0.215, rx: 0.2, ry: 0.175 };
const FACE_FINER = 2.2;
const HEAD_BULGE = Number(opt.headbulge || 0.7);
const JITTER = 0.25;
const headMask = (nx, ny) => 1 - smooth(0.82, 1.12, Math.hypot((nx - HEAD.cx) / HEAD.rx, (ny - HEAD.cy) / HEAD.ry));
const headDome = (nx, ny) => {
  const r2 = ((nx - HEAD.cx) / (HEAD.rx * 0.85)) ** 2 + ((ny - HEAD.cy) / (HEAD.ry * 0.95)) ** 2;
  return Math.sqrt(Math.max(0, 1 - r2));
};

// ---- Tone preprocessing
// Unsharp mask, then per-region levels: face 5..95 percentile to 0..1 with gamma 0.8, torso with its own levels.
const Lblur = boxBlur(Lm, 2);
const Lu = new Float32Array(N);
for (let i = 0; i < N; i++) Lu[i] = Lm[i] + 0.9 * (Lm[i] - Lblur[i]);
const LuF = boxBlur(Lu, 1);
const LuT = boxBlur(Lu, 2);
const hmap = new Float32Array(N);
for (let i = 0; i < N; i++) hmap[i] = headMask((i % W) / W, ((i / W) | 0) / H);
function percentiles(arr, test, lo, hi) {
  const v = [];
  for (let i = 0; i < N; i += 2) if (A[i] > 0.5 && test(i)) v.push(arr[i]);
  v.sort((a, b) => a - b);
  return [v[Math.floor(v.length * lo)], v[Math.floor(v.length * hi)]];
}
const [fLo, fHi] = percentiles(LuF, (i) => hmap[i] > 0.6, 0.04, 0.9);
const [tLo, tHi] = percentiles(LuT, (i) => hmap[i] < 0.2, 0.02, 0.98);
const clamp01 = (x) => Math.min(1, Math.max(0, x));
const FACE_FLOOR = 0.06;
const TORSO_FLOOR = 0.2;
function toneAt(i, hm) {
  const f = FACE_FLOOR + (1 - FACE_FLOOR) * Math.pow(clamp01((LuF[i] - fLo) / (fHi - fLo)), 0.8);
  const t = TORSO_FLOOR + (1 - TORSO_FLOOR) * Math.pow(clamp01((LuT[i] - tLo) / (tHi - tLo)), 0.9);
  let tone = t * (1 - hm) + f * hm;
  // Keep the silhouette (hair line, shoulders) present even where the source is near black.
  tone = Math.max(tone, 0.5 * sil[i]);
  return clamp01(tone);
}

// ---- Jittered grids
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

let minX = W, maxX = 0, minY = H, maxY = 0;
let areaHead = 0, areaBody = 0;
for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
  const i = y * W + x;
  if (A[i] <= 0.5) continue;
  if (x < minX) minX = x; if (x > maxX) maxX = x; if (y < minY) minY = y; if (y > maxY) maxY = y;
  const hm = hmap[i];
  areaHead += hm; areaBody += 1 - hm;
}
const scale = WORLD_HEIGHT / (maxY - minY);
const cx = (minX + maxX) / 2;
const cy = (minY + maxY) / 2;

function buildGrid(cellT) {
  const cellF = cellT / FACE_FINER;
  const out = [];
  const pass = (cell, faceGrid) => {
    for (let gy = 0; gy * cell < H; gy++) {
      for (let gx = 0; gx * cell < W; gx++) {
        const px = (gx + 0.5 + (rand() - 0.5) * 2 * JITTER) * cell;
        const py = (gy + 0.5 + (rand() - 0.5) * 2 * JITTER) * cell;
        const ix = Math.min(W - 1, Math.floor(px));
        const iy = Math.min(H - 1, Math.floor(py));
        const i = iy * W + ix;
        if (A[i] <= 0.5) continue;
        const hm = hmap[i];
        const p = smooth(0.15, 0.85, hm);
        if (rand() > (faceGrid ? p : 1 - p)) continue;
        out.push(px, py);
      }
    }
  };
  pass(cellT, false);
  pass(cellF, true);
  return out;
}
let cellT = Math.sqrt((areaHead * FACE_FINER * FACE_FINER + areaBody) / COUNT);
let pts = buildGrid(cellT);
for (let tries = 0; pts.length / 2 < COUNT && tries < 40; tries++) {
  cellT *= 0.99;
  pts = buildGrid(cellT);
}
const total = pts.length / 2;
const order = Array.from({ length: total }, (_, i) => i);
for (let i = total - 1; i > 0; i--) {
  const j = Math.floor(rand() * (i + 1));
  [order[i], order[j]] = [order[j], order[i]];
}
const N_OUT = Math.min(COUNT, total);

const header = Buffer.alloc(12);
header.write("SIG4", 0, "ascii");
header.writeUInt32LE(N_OUT, 4);
header.writeUInt32LE(QUANT, 8);
const pos = Buffer.alloc(N_OUT * 6);
const col = Buffer.alloc(N_OUT * 5);
const prev = opt.preview ? Buffer.alloc(W * H * 3) : null;
const SKIN_HUE = 0.13;
let headCount = 0;

for (let n = 0; n < N_OUT; n++) {
  const k = order[n];
  const fx = pts[k * 2];
  const fy = pts[k * 2 + 1];
  const ix = Math.min(W - 1, Math.floor(fx));
  const iy = Math.min(H - 1, Math.floor(fy));
  const i = iy * W + ix;
  const nx = fx / W;
  const ny = fy / H;
  const hm = hmap[i];
  if (hm > 0.5) headCount++;

  // Depth: round body, head ellipsoid, mild luminance relief (capped so the grid holds from the front).
  const t = clamp01((bulge[i] - 0.5) / 0.5);
  const dome = Math.sqrt(Math.max(0, 1 - (1 - t) * (1 - t)));
  let z = (dome - 0.45) * BODY_DEPTH;
  z += (Lb[i] - 0.5) * 0.05;
  z += HEAD_BULGE * hm * headDome(nx, ny) + 0.12 * hm;
  pos.writeInt16LE(Math.round((fx - cx) * scale * QUANT), n * 6);
  pos.writeInt16LE(Math.round(-(fy - cy) * scale * QUANT), n * 6 + 2);
  pos.writeInt16LE(Math.round(z * QUANT), n * 6 + 4);

  // Color: tone-mapped ultraviolet ramp, with a whisper of the source hue on skin.
  const tone = toneAt(i, hm);
  const pal = tone < 0.55
    ? UV_DEEP.map((c, q) => c + (UV[q] - c) * (tone / 0.55))
    : UV.map((c, q) => c + (HOT[q] - c) * ((tone - 0.55) / 0.45));
  const mx = Math.max(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2], 1) / 255;
  for (let q = 0; q < 3; q++) {
    const srcN = Math.min(1, rgba[i * 4 + q] / 255 / mx);
    col[n * 5 + q] = Math.round(255 * (pal[q] * (1 - SKIN_HUE * hm) + srcN * SKIN_HUE * hm));
  }
  col[n * 5 + 3] = Math.round(255 * tone);
  col[n * 5 + 4] = Math.round(255 * (1 / (1 + (FACE_FINER - 1) * smooth(0.15, 0.85, hm))));
  if (prev) {
    const o = (Math.min(H - 1, Math.floor(fy)) * W + Math.min(W - 1, Math.floor(fx))) * 3;
    for (let q = 0; q < 3; q++) prev[o + q] = Math.min(255, prev[o + q] + col[n * 5 + q] * Math.pow(tone, 1.2) * 2.2);
  }
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, Buffer.concat([header, pos, col]));
console.log(`baked ${N_OUT} points (${headCount} in the head, cells ${(cellT / FACE_FINER).toFixed(2)}/${cellT.toFixed(2)}px) from ${W}x${H} -> ${OUT} (${((12 + N_OUT * 11) / 1024).toFixed(0)} KB)`);

if (prev) {
  await sharp(prev, { raw: { width: W, height: H, channels: 3 } }).png().toFile(opt.preview);
  console.log("preview ->", opt.preview);
  const L0 = Math.round(W * (HEAD.cx - HEAD.rx));
  const T0 = Math.round(H * (HEAD.cy - HEAD.ry));
  await sharp(opt.preview)
    .extract({ left: L0, top: Math.max(0, T0), width: Math.round(W * HEAD.rx * 2), height: Math.round(H * HEAD.ry * 2) })
    .resize({ width: 900, kernel: "nearest" })
    .toFile(opt.preview.replace(/\.png$/, "-head.png"));
}
