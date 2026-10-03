/**
 * The hero portrait: ~60K points baked offline by scripts/bake-portrait.mjs from a background-removed photo.
 * The photo itself is never shipped, only sampled points.
 *
 * public/signal/portrait.bin layout (little endian):
 *   "SIG1" | uint32 N | uint32 QUANT | N * (int16 x, y, z) | N * (uint8 r, g, b)
 * Positions are world units * QUANT. Colors are already blended toward the brand palette.
 * Points are i.i.d. samples, so a prefix of K points is an unbiased subset (mobile).
 */

export type PortraitData = { positions: Float32Array; tint: Float32Array };

const SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/signal/portrait.bin`;
const MAGIC = "SIG1";
const HEADER_BYTES = 12;
/** Tint brightness: dim shadows a little so contrast between shirt, skin and hair survives. */
const BRIGHT_MIN = 0.3;
const BRIGHT_RANGE = 1.1;

export async function loadPortrait(count: number): Promise<PortraitData | null> {
  try {
    const res = await fetch(SRC);
    if (!res.ok) return null;
    const buf = await res.arrayBuffer();
    const view = new DataView(buf);
    const magic = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
    if (magic !== MAGIC) return null;
    const total = view.getUint32(4, true);
    const quant = view.getUint32(8, true);
    const posOffset = HEADER_BYTES;
    const colOffset = HEADER_BYTES + total * 6;
    if (buf.byteLength < colOffset + total * 3) return null;

    const positions = new Float32Array(count * 3);
    const tint = new Float32Array(count * 4);
    const rgb = new Uint8Array(buf, colOffset, total * 3);
    for (let i = 0; i < count; i++) {
      // Wrap with a tiny fan-out if more particles are requested than baked.
      const j = i % total;
      const fan = i >= total ? 0.004 : 0;
      positions[i * 3] = view.getInt16(posOffset + j * 6, true) / quant + (fan ? (Math.random() - 0.5) * fan : 0);
      positions[i * 3 + 1] = view.getInt16(posOffset + j * 6 + 2, true) / quant + (fan ? (Math.random() - 0.5) * fan : 0);
      positions[i * 3 + 2] = view.getInt16(posOffset + j * 6 + 4, true) / quant + (fan ? (Math.random() - 0.5) * fan : 0);
      const r = rgb[j * 3] / 255;
      const g = rgb[j * 3 + 1] / 255;
      const b = rgb[j * 3 + 2] / 255;
      const luma = 0.299 * r + 0.587 * g + 0.114 * b;
      tint[i * 4] = r;
      tint[i * 4 + 1] = g;
      tint[i * 4 + 2] = b;
      tint[i * 4 + 3] = BRIGHT_MIN + BRIGHT_RANGE * luma;
    }
    return { positions, tint };
  } catch {
    return null;
  }
}
