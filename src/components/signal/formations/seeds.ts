import { mulberry32 } from "./rng";

const SEED = 0x51a1;

/**
 * Per-particle random seeds: x seed, y size jitter, z heat, w phase. Deterministic, so a formation that
 * assigns roles by seed (the globe's arc and city markers) and the point shader agree on every particle.
 */
export function particleSeeds(count: number): Float32Array {
  const rand = mulberry32(SEED);
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    out[i * 4] = rand();
    out[i * 4 + 1] = 0.6 + rand() * 0.8;
    out[i * 4 + 2] = rand();
    out[i * 4 + 3] = rand();
  }
  return out;
}
