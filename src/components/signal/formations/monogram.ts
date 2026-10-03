import { mulberry32 } from "./rng";

const CW = 1100;
const CH = 600;
/** World units per canvas pixel. */
const SCALE = 3.5 / 760;
const HALF_DEPTH = 0.4;
/** Share of points on the contour walls vs. the two faces; interior volume stays nearly empty. */
const WALL_SHARE = 0.62;
const FACE_KEEP = 0.2;

/**
 * "DB" drawn from geometry (not a font) so it is identical on every platform:
 * heavy slab D and B, built from a stem plus half-ring bowls.
 */
function drawMonogram(ctx: CanvasRenderingContext2D) {
  const H = 440;
  const T = 112;
  const y0 = (CH - H) / 2;
  const dW = 360;
  const bW = 340;
  const gap = 56;
  const x0 = (CW - (dW + gap + bW)) / 2;

  const bowl = (x: number, y: number, w: number, h: number, inset: number) => {
    const r = h / 2 - inset;
    const cx = x + w - h / 2;
    ctx.beginPath();
    ctx.moveTo(x + inset, y + inset);
    ctx.lineTo(cx, y + inset);
    ctx.arc(cx, y + h / 2, r, -Math.PI / 2, Math.PI / 2);
    ctx.lineTo(x + inset, y + h - inset);
    ctx.closePath();
    ctx.fill();
  };

  ctx.clearRect(0, 0, CW, CH);
  ctx.fillStyle = "#fff";
  ctx.globalCompositeOperation = "source-over";

  // D
  bowl(x0, y0, dW, H, 0);
  // B: two bowls sharing a middle bar of thickness T
  const bx = x0 + dW + gap;
  const h1 = H * 0.5 + T / 2;
  const h2 = H - h1 + T;
  const w1 = bW * 0.9;
  bowl(bx, y0, w1, h1, 0);
  bowl(bx, y0 + h1 - T, bW, h2, 0);

  // Counters
  ctx.globalCompositeOperation = "destination-out";
  bowl(x0, y0, dW, H, T);
  bowl(bx, y0, w1, h1, T);
  bowl(bx, y0 + h1 - T, bW, h2, T);
  ctx.globalCompositeOperation = "source-over";
}

/** The letters "DB" as a thick extruded 3D sculpture of points. */
export function monogramFormation(count: number): Float32Array {
  const rand = mulberry32(2024);
  const out = new Float32Array(count * 3);
  const canvas = document.createElement("canvas");
  canvas.width = CW;
  canvas.height = CH;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return out;
  drawMonogram(ctx);
  const data = ctx.getImageData(0, 0, CW, CH).data;

  const lit = (x: number, y: number) => x >= 0 && y >= 0 && x < CW && y < CH && data[(y * CW + x) * 4 + 3] > 128;
  const EDGE = 6;
  const walls: number[] = [];
  const interior: number[] = [];
  for (let y = 0; y < CH; y += 1) {
    for (let x = 0; x < CW; x += 1) {
      if (!lit(x, y)) continue;
      const isEdge = !(lit(x - EDGE, y) && lit(x + EDGE, y) && lit(x, y - EDGE) && lit(x, y + EDGE));
      (isEdge ? walls : interior).push(x, y);
    }
  }
  if (walls.length === 0) return out;
  const nw = walls.length / 2;
  const ni = Math.max(1, interior.length / 2);

  // Contours get most of the points, spread through the full thickness so the extrusion has visible walls.
  // The faces get a sparse veil at the front and back plane, so the letters read as luminous glass, not a slab.
  for (let i = 0; i < count; i++) {
    let px: number;
    let py: number;
    let z: number;
    if (rand() < WALL_SHARE) {
      const k = Math.floor(rand() * nw);
      px = walls[k * 2] + rand();
      py = walls[k * 2 + 1] + rand();
      z = (rand() * 2 - 1) * HALF_DEPTH;
    } else {
      const k = Math.floor(rand() * ni);
      const source = interior.length ? interior : walls;
      px = source[k * 2] + rand();
      py = source[k * 2 + 1] + rand();
      if (rand() > FACE_KEEP && interior.length) {
        // Most face samples are redistributed onto the two planes near the contours, leaving the core airy.
        const w = Math.floor(rand() * nw);
        px = walls[w * 2] + rand();
        py = walls[w * 2 + 1] + rand();
      }
      z = (rand() < 0.5 ? -1 : 1) * HALF_DEPTH + (rand() - 0.5) * 0.03;
    }
    out[i * 3] = (px - CW / 2) * SCALE;
    out[i * 3 + 1] = -(py - CH / 2) * SCALE;
    out[i * 3 + 2] = z;
  }
  return out;
}
