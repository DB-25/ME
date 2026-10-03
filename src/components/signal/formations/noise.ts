import { gauss, mulberry32, valueNoise3 } from "./rng";

/** Soft volumetric nebula: gaussian core, domain-warped by value noise so it reads as filaments. */
export function noiseFormation(count: number): Float32Array {
  const rand = mulberry32(1337);
  const out = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    let x = gauss(rand) * 1.0;
    let y = gauss(rand) * 0.7;
    let z = gauss(rand) * 0.7;
    // Two warp passes: pushes points along noise gradients, giving wisps.
    for (let k = 0; k < 2; k++) {
      const f = 0.9 + k * 0.7;
      const wx = valueNoise3(x * f + 11, y * f, z * f);
      const wy = valueNoise3(x * f, y * f + 23, z * f);
      const wz = valueNoise3(x * f, y * f, z * f + 37);
      x += wx * 0.9;
      y += wy * 0.7;
      z += wz * 0.7;
    }
    // Denser core, long soft tail.
    const r = 1 + 0.35 * Math.pow(rand(), 3);
    out[i * 3] = x * 1.5 * r;
    out[i * 3 + 1] = y * 1.35 * r;
    out[i * 3 + 2] = z * 1.2 * r;
  }
  return out;
}
