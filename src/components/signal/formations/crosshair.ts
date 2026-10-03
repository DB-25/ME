import { gauss, mulberry32 } from "./rng";

const GAP = 0.3;
const LEN = 0.95;
const THICK = 0.032;
const DEPTH = 0.05;

/** Valorant-style crosshair: center dot plus four bars with a gap, crisp and bold. */
export function crosshairFormation(count: number): Float32Array {
  const rand = mulberry32(5);
  const out = new Float32Array(count * 3);
  const dotShare = 0.08;
  const barShare = 0.82;
  for (let i = 0; i < count; i++) {
    const u = rand();
    let x: number;
    let y: number;
    if (u < dotShare) {
      const a = rand() * Math.PI * 2;
      const r = Math.sqrt(rand()) * 0.075;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
    } else if (u < dotShare + barShare) {
      const side = Math.floor(rand() * 4);
      const along = GAP + rand() * LEN;
      const across = (rand() - 0.5) * 2 * THICK;
      if (side === 0) { x = along; y = across; }
      else if (side === 1) { x = -along; y = across; }
      else if (side === 2) { x = across; y = along; }
      else { x = across; y = -along; }
    } else {
      // Faint outer ring, like a scope.
      const a = rand() * Math.PI * 2;
      const r = 1.55 + gauss(rand) * 0.006;
      x = Math.cos(a) * r;
      y = Math.sin(a) * r;
    }
    out[i * 3] = x * 1.5;
    out[i * 3 + 1] = y * 1.5;
    out[i * 3 + 2] = (rand() - 0.5) * 2 * DEPTH;
  }
  return out;
}
