/**
 * Globe geometry shared by the formation generator (worker), the point shader and the story rig.
 * Pure numbers, no three.js, so the worker can import it.
 *
 * The formation is baked in the DEFAULT view (both cities on the visible hemisphere, arc level across the
 * top). The story turns it at runtime with a rotation from that baked frame to the current view.
 */

export const DEG = Math.PI / 180;
export const GLOBE_R = 1.7;
export const BANGALORE = { lat: 12.97, lon: 77.59 };
export const BOSTON = { lat: 42.36, lon: -71.06 };

/** Particle roles, by the deterministic seed x: [0, ARC_SHARE) arc, then CITY_SHARE city markers, the rest surface and atmosphere. */
export const ARC_SHARE = 0.06;
export const CITY_SHARE = 0.022;
/** Share of the non-role particles on the atmosphere shell. */
export const ATMO_SHARE = 0.055;
/** Fraction of far-side surface points kept (by seed w) so the globe reads solid, not wireframe. */
export const BACKSIDE_KEEP = 0.1;
export const ARC_LIFT = 0.3;

/** Story views: where the camera centers (degrees). Bangalore sits low in the India view, Boston high and left in the Boston view. */
export const INDIA_VIEW = { lat: 24, lon: 78 };
export const BOSTON_VIEW = { lat: 36, lon: -52 };

/** Default view: centered near the arc's midpoint at a moderate latitude. */
const VIEW_LAT_DEG = 30;
const VIEW_LON_SHIFT_DEG = 8;

export type V3 = [number, number, number];

export const toVec = (latDeg: number, lonDeg: number): V3 => {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

export const normalize = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

export const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
export const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

export type Basis = { right: V3; up: V3; forward: V3 };

/**
 * Default view basis: centered near the arc's midpoint longitude, then rolled so the Bangalore to Boston
 * chord is level. The arc reads as a bow across the top with Bangalore on the right and Boston on the left.
 */
export function defaultBasis(): Basis {
  const a = toVec(BANGALORE.lat, BANGALORE.lon);
  const b = toVec(BOSTON.lat, BOSTON.lon);
  const mid = normalize([a[0] + b[0], a[1] + b[1], a[2] + b[2]]);
  const lon = Math.atan2(mid[0], mid[2]) / DEG;
  const forward = toVec(VIEW_LAT_DEG, lon + VIEW_LON_SHIFT_DEG);
  const d = forward[1];
  const up = normalize([-forward[0] * d, 1 - forward[1] * d, -forward[2] * d]);
  const right = normalize(cross(up, forward));
  const roll = Math.atan2(dot(a, up) - dot(b, up), dot(a, right) - dot(b, right));
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  return {
    right: normalize([right[0] * c + up[0] * s, right[1] * c + up[1] * s, right[2] * c + up[2] * s]),
    up: normalize([up[0] * c - right[0] * s, up[1] * c - right[1] * s, up[2] * c - right[2] * s]),
    forward,
  };
}

const DEFAULT = defaultBasis();
const DEFAULT_ROWS = [DEFAULT.right, DEFAULT.up, DEFAULT.forward];
const F0 = toVec(INDIA_VIEW.lat, INDIA_VIEW.lon);
const F1 = toVec(BOSTON_VIEW.lat, BOSTON_VIEW.lon);
const TURN_ANGLE = Math.acos(Math.min(1, dot(F0, F1)));
const TURN_SIN = Math.sin(TURN_ANGLE);

/** Scratch rows of the current view, [right, up, forward] in earth coordinates. Reused every frame. */
const view = new Float64Array(9);

const normalizeRow = (a: Float64Array, o: number) => {
  const l = Math.hypot(a[o], a[o + 1], a[o + 2]) || 1;
  a[o] /= l;
  a[o + 1] /= l;
  a[o + 2] /= l;
};

/**
 * Writes the row-major 3x3 that turns the baked (default-view) globe into the story view.
 * `turn` 0..1 moves the camera along the great circle from India to Boston (north stays up);
 * `mode` 0..1 blends from the default view into the story views. mode 0 is the identity.
 * Allocates nothing.
 */
export function storyRotation(out: Float64Array, turn: number, mode: number) {
  const w0 = TURN_SIN > 1e-6 ? Math.sin((1 - turn) * TURN_ANGLE) / TURN_SIN : 1 - turn;
  const w1 = TURN_SIN > 1e-6 ? Math.sin(turn * TURN_ANGLE) / TURN_SIN : turn;
  // Story forward, and its north-up basis vector.
  let sx = F0[0] * w0 + F1[0] * w1;
  let sy = F0[1] * w0 + F1[1] * w1;
  let sz = F0[2] * w0 + F1[2] * w1;
  const sl = Math.hypot(sx, sy, sz) || 1;
  sx /= sl;
  sy /= sl;
  sz /= sl;
  let ux = -sy * sx;
  let uy = 1 - sy * sy;
  let uz = -sy * sz;
  const ul = Math.hypot(ux, uy, uz) || 1;
  ux /= ul;
  uy /= ul;
  uz /= ul;

  const df = DEFAULT.forward;
  const du = DEFAULT.up;
  view[6] = df[0] + (sx - df[0]) * mode;
  view[7] = df[1] + (sy - df[1]) * mode;
  view[8] = df[2] + (sz - df[2]) * mode;
  normalizeRow(view, 6);
  view[3] = du[0] + (ux - du[0]) * mode;
  view[4] = du[1] + (uy - du[1]) * mode;
  view[5] = du[2] + (uz - du[2]) * mode;
  // Orthonormalize up against forward, then right = up x forward.
  const d = view[3] * view[6] + view[4] * view[7] + view[5] * view[8];
  view[3] -= d * view[6];
  view[4] -= d * view[7];
  view[5] -= d * view[8];
  normalizeRow(view, 3);
  view[0] = view[4] * view[8] - view[5] * view[7];
  view[1] = view[5] * view[6] - view[3] * view[8];
  view[2] = view[3] * view[7] - view[4] * view[6];

  // M[i][j] = dot(current row i, default row j): earth = D^T baked, current = C earth.
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const r = DEFAULT_ROWS[j];
      out[i * 3 + j] = view[i * 3] * r[0] + view[i * 3 + 1] * r[1] + view[i * 3 + 2] * r[2];
    }
  }
}
