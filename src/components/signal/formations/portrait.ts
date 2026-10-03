/**
 * The hero portrait: ~60K points baked offline by scripts/bake-portrait.mjs from a background-removed photo.
 * The photo itself is never shipped, only sampled points.
 *
 * public/signal/portrait.bin layout (little endian):
 *   "SIG4" | uint32 N | uint32 QUANT | N * (int16 x, y, z) | N * (uint8 r, g, b, t, c)
 * Positions are world units * QUANT. Colors are already blended toward the brand palette;
 * t is the per-particle tone (halftone: the shader maps it to alpha and sprite size).
 * Points are i.i.d. samples, so a prefix of K points is an unbiased subset (mobile).
 */

export type PortraitData = { positions: Float32Array; tint: Float32Array; cell: Float32Array };

const SRC = `${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/signal/portrait.bin`;
const MAGIC = "SIG4";
const HEADER_BYTES = 12;

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
    if (buf.byteLength < colOffset + total * 5) return null;

    const positions = new Float32Array(count * 3);
    const tint = new Float32Array(count * 4);
    const cell = new Float32Array(count);
    const rgb = new Uint8Array(buf, colOffset, total * 5);
    for (let i = 0; i < count; i++) {
      // Wrap with a tiny fan-out if more particles are requested than baked.
      const j = i % total;
      const fan = i >= total ? 0.004 : 0;
      positions[i * 3] = view.getInt16(posOffset + j * 6, true) / quant + (fan ? (Math.random() - 0.5) * fan : 0);
      positions[i * 3 + 1] = view.getInt16(posOffset + j * 6 + 2, true) / quant + (fan ? (Math.random() - 0.5) * fan : 0);
      positions[i * 3 + 2] = view.getInt16(posOffset + j * 6 + 4, true) / quant + (fan ? (Math.random() - 0.5) * fan : 0);
      tint[i * 4] = rgb[j * 5] / 255;
      tint[i * 4 + 1] = rgb[j * 5 + 1] / 255;
      tint[i * 4 + 2] = rgb[j * 5 + 2] / 255;
      tint[i * 4 + 3] = rgb[j * 5 + 3] / 255;
      cell[i] = rgb[j * 5 + 4] / 255;
    }
    return { positions, tint, cell };
  } catch {
    return null;
  }
}
