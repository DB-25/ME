import { gauss, mulberry32 } from "./rng";

const COLS = 160;
const ROWS = 64;
const WIDTH = 12;
const DEPTH = 5.4;
/** Radians about X: shallow, so the field reads as a receding floor seen from above at dusk. */
const TILT = -1.22;
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
      // Far rows thin out so the floor dissolves into the distance instead of ending on an edge.
      const far = Math.min(1, Math.max(0, (v - 0.1) / 0.9));
      if (rand() < far * far * 0.8) continue;
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
