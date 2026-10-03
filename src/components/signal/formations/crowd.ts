import { gauss, mulberry32 } from "./rng";

const COLS = 96;
const ROWS = 52;
const WIDTH = 5.6;
const DEPTH = 3.8;
const TILT = -0.95; // radians about X, looking down at the floor
const PERSON_RADIUS = 0.0035;

/**
 * A crowd seen from above: an elliptical field of evenly spaced people, each a
 * tight blob of points, tilted back so perspective gives depth.
 */
export function crowdFormation(count: number): Float32Array {
  const rand = mulberry32(77);
  const out = new Float32Array(count * 3);

  const people: number[] = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const u = ((c + (r % 2 ? 0.5 : 0)) / COLS) * 2 - 1;
      const v = (r / ROWS) * 2 - 1;
      if (u * u + v * v > 1) continue;
      people.push((u * WIDTH) / 2, (v * DEPTH) / 2);
    }
  }
  const n = people.length / 2;
  const cos = Math.cos(TILT);
  const sin = Math.sin(TILT);
  for (let i = 0; i < count; i++) {
    const p = i % n;
    const x = people[p * 2] + gauss(rand) * PERSON_RADIUS;
    const y = people[p * 2 + 1] + gauss(rand) * PERSON_RADIUS;
    const z = (rand() < 0.3 ? 0.04 : 0) + gauss(rand) * 0.004;
    out[i * 3] = x;
    out[i * 3 + 1] = y * cos - z * sin;
    out[i * 3 + 2] = y * sin + z * cos;
  }
  return out;
}
