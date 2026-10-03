import { gauss, mulberry32 } from "./rng";

/** Everything collapses: a tiny intense core, a faint halo, a thin accretion ring. */
export function singularityFormation(count: number): Float32Array {
  const rand = mulberry32(8);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const u = rand();
    if (u < 0.74) {
      const r = Math.abs(gauss(rand)) * 0.022;
      const d = [gauss(rand), gauss(rand), gauss(rand)];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      out[i * 3] = (d[0] / l) * r;
      out[i * 3 + 1] = (d[1] / l) * r;
      out[i * 3 + 2] = (d[2] / l) * r;
    } else if (u < 0.9) {
      const a = rand() * Math.PI * 2;
      const r = 0.55 + gauss(rand) * 0.012;
      // Accretion ring, tilted.
      const x = Math.cos(a) * r;
      const y = Math.sin(a) * r * 0.28;
      const t = 0.35;
      out[i * 3] = x * Math.cos(t) - y * Math.sin(t);
      out[i * 3 + 1] = x * Math.sin(t) + y * Math.cos(t);
      out[i * 3 + 2] = gauss(rand) * 0.01;
    } else {
      const r = 0.1 + Math.pow(rand(), 2.2) * 1.4;
      const d = [gauss(rand), gauss(rand), gauss(rand)];
      const l = Math.hypot(d[0], d[1], d[2]) || 1;
      out[i * 3] = (d[0] / l) * r;
      out[i * 3 + 1] = (d[1] / l) * r;
      out[i * 3 + 2] = (d[2] / l) * r;
    }
  }
  return out;
}
