import { mulberry32, valueNoise3 } from "./rng";

/**
 * SIGNAL: noise becoming signal. A wide landscape of hairline waveforms stacked in depth.
 * Each line runs from chaotic multi-octave noise (left) to clean phase-aligned sine waves (right).
 *
 * The animated field is evaluated in the vertex shader (see shaders.ts, `signalPos`); this module owns the
 * layout constants, the per-particle (u, v, jitter) attribute, and a static t=0 approximation used when the
 * formation is a plain morph target (Director `form`, override slots).
 *
 * Particle i belongs to line (i % lines) at slot floor(i / lines). Slots use a golden-ratio sequence, so any
 * prefix of the buffer (adaptive quality) is still an evenly spread hairline on every line. This formation is
 * therefore never shuffled.
 */

export type SignalLayout = {
  lines: number;
  /** World width of a line. Desktop bleeds ~1.3x off a 16:10 viewport. */
  width: number;
  /** World depth the lines are stacked across. */
  depth: number;
  /** Wavelength of the clean signal. */
  wavelength: number;
  /** Peak height of the clean signal. */
  amplitude: number;
  /** Peak height scale of the noise. */
  noise: number;
  /** Phase shift across the stack, so crests form regular diagonal ridges. */
  phasePerLine: number;
  /** Camera elevation and 3/4 yaw baked into the field. */
  pitch: number;
  yaw: number;
};

const GOLDEN = 0.6180339887498949;
const SECOND = 0.7548776662466927;

export function signalLayout(count: number): SignalLayout {
  const compact = count <= 30_000;
  return compact
    ? { lines: 60, width: 3.2, depth: 3.9, wavelength: 1.05, amplitude: 0.17, noise: 0.42, phasePerLine: 3.4, pitch: 0.62, yaw: -0.3 }
    : { lines: 96, width: 10.5, depth: 4.2, wavelength: 1.25, amplitude: 0.13, noise: 0.45, phasePerLine: 5, pitch: 0.44, yaw: -0.14 };
}

/** Row-major 3x3: Rx(pitch) * Ry(yaw). Local x runs along a line, y is height, z is depth. */
export function signalRotation(l: SignalLayout): number[] {
  const cp = Math.cos(l.pitch);
  const sp = Math.sin(l.pitch);
  const cy = Math.cos(l.yaw);
  const sy = Math.sin(l.yaw);
  return [cy, 0, sy, sp * sy, cp, -sp * cy, -cp * sy, sp, cp * cy];
}

/** Per-particle (u along line, v across lines, jitter x, jitter y). Same for every frame of the animation. */
export function signalAttributes(count: number): Float32Array {
  const { lines } = signalLayout(count);
  const rand = mulberry32(711);
  const out = new Float32Array(count * 4);
  for (let i = 0; i < count; i++) {
    const line = i % lines;
    const slot = Math.floor(i / lines);
    out[i * 4] = (0.5 + slot * GOLDEN + line * SECOND) % 1;
    out[i * 4 + 1] = (line + 0.5) / lines;
    // Roughly gaussian jitter in [-1, 1].
    out[i * 4 + 2] = (rand() + rand() + rand() - 1.5) / 1.5;
    out[i * 4 + 3] = (rand() + rand() + rand() - 1.5) / 1.5;
  }
  return out;
}

const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Static frame (t = 0) of the field, rotated into view. Mirrors the shader without time. */
export function signalFormation(count: number): Float32Array {
  const layout = signalLayout(count);
  const attrs = signalAttributes(count);
  const rot = signalRotation(layout);
  const out = new Float32Array(count * 3);
  const k = (Math.PI * 2) / layout.wavelength;
  for (let i = 0; i < count; i++) {
    const u = attrs[i * 4];
    const v = attrs[i * 4 + 1];
    const s = smoothstep(0.3, 0.68, u);
    const x = (u - 0.5) * layout.width;
    const z = (v - 0.5) * layout.depth;
    const n =
      valueNoise3(x * 1.1, z * 0.6, 0) * 0.55 + valueNoise3(x * 3.4, z * 2.5, 5) * 0.3 + valueNoise3(x * 9, z * 9, 9) * 0.2;
    const wave = Math.sin(k * x + v * layout.phasePerLine);
    const scatter = Math.pow(1 - s, 1.5);
    const lx = x + attrs[i * 4 + 2] * scatter * 0.08;
    const ly = n * layout.noise * (1 - s) + wave * layout.amplitude * s + attrs[i * 4 + 3] * scatter * 0.12;
    out[i * 3] = rot[0] * lx + rot[1] * ly + rot[2] * z;
    out[i * 3 + 1] = rot[3] * lx + rot[4] * ly + rot[5] * z;
    out[i * 3 + 2] = rot[6] * lx + rot[7] * ly + rot[8] * z;
  }
  return out;
}
