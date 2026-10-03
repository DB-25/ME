import { gauss, mulberry32 } from "./rng";

const RINGS = [0.65, 1.05, 1.5, 1.95, 2.4];
const TILT = -0.95;
const CLUSTERS = 11;

/** Concentric orbit rings with a few bright star clusters riding on them. */
export function constellationFormation(count: number): Float32Array {
  const rand = mulberry32(31);
  const out = new Float32Array(count * 3);
  const cos = Math.cos(TILT);
  const sin = Math.sin(TILT);
  const place = (i: number, x: number, y: number, z: number) => {
    out[i * 3] = x;
    out[i * 3 + 1] = y * cos - z * sin;
    out[i * 3 + 2] = y * sin + z * cos;
  };

  const clusters = Array.from({ length: CLUSTERS }, (_, k) => {
    const ring = k % RINGS.length;
    const a = rand() * Math.PI * 2;
    return { x: Math.cos(a) * RINGS[ring], y: Math.sin(a) * RINGS[ring], r: 0.04 + rand() * 0.05 };
  });
  // The central star is the brightest.
  clusters.push({ x: 0, y: 0, r: 0.09 });

  const ringShare = 0.62;
  const clusterShare = 0.3;
  for (let i = 0; i < count; i++) {
    const u = rand();
    if (u < ringShare) {
      const ring = Math.floor(rand() * RINGS.length);
      const a = rand() * Math.PI * 2;
      const rr = RINGS[ring] + gauss(rand) * 0.012;
      place(i, Math.cos(a) * rr, Math.sin(a) * rr, gauss(rand) * 0.01);
    } else if (u < ringShare + clusterShare) {
      const c = clusters[Math.floor(Math.pow(rand(), 1.4) * clusters.length)];
      place(i, c.x + gauss(rand) * c.r, c.y + gauss(rand) * c.r, gauss(rand) * c.r * 0.6);
    } else {
      // Faint dust between the rings.
      const a = rand() * Math.PI * 2;
      const rr = Math.sqrt(rand()) * 2.7;
      place(i, Math.cos(a) * rr, Math.sin(a) * rr, gauss(rand) * 0.15);
    }
  }
  return out;
}
