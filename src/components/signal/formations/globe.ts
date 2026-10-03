import { isLand } from "./landmask";
import { gauss, mulberry32 } from "./rng";

const R = 1.7;
const DEG = Math.PI / 180;
const BANGALORE = { lat: 12.97, lon: 77.59 };
const BOSTON = { lat: 42.36, lon: -71.06 };
/** Ocean points kept relative to land points. */
const OCEAN_KEEP = 0.04;
/** Land away from a coast is thinned a little so coastlines read as bright contours. */
const INLAND_KEEP = 0.5;
const COAST_PROBE_DEG = 2.4;
/** Fraction of far-side points kept so the globe reads solid, not wireframe. */
const BACKSIDE_KEEP = 0.12;
const ARC_LIFT = 0.3;
/** Camera latitude, and longitude offset from the arc midpoint, in degrees. */
const VIEW_LAT_DEG = 30;
const VIEW_LON_SHIFT_DEG = 8;

type V3 = [number, number, number];

const toVec = (latDeg: number, lonDeg: number): V3 => {
  const la = latDeg * DEG;
  const lo = lonDeg * DEG;
  return [Math.cos(la) * Math.sin(lo), Math.sin(la), Math.cos(la) * Math.cos(lo)];
};

const normalize = (v: V3): V3 => {
  const l = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / l, v[1] / l, v[2] / l];
};

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

/**
 * View basis: centered near the arc's midpoint longitude at a moderate latitude, then rolled so the
 * Bangalore to Boston chord is level. The arc reads as a bow across the top of the globe with
 * Bangalore on the right and Boston on the left, both ends on the visible hemisphere.
 */
function viewBasis(): { right: V3; up: V3; forward: V3 } {
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

/** Point-cloud Earth (land dense, ocean sparse) with a lifted Bangalore to Boston arc. */
export function globeFormation(count: number): Float32Array {
  const rand = mulberry32(4242);
  const out = new Float32Array(count * 3);
  const basis = viewBasis();
  const rotate = (v: V3): V3 => [dot(v, basis.right), dot(v, basis.up), dot(v, basis.forward)];

  let i = 0;
  const put = (v: V3, scale = 1) => {
    if (i >= count) return;
    const r = rotate(v);
    out[i * 3] = r[0] * R * scale;
    out[i * 3 + 1] = r[1] * R * scale;
    out[i * 3 + 2] = r[2] * R * scale;
    i++;
  };

  const surfaceCount = Math.floor(count * 0.8);
  const atmoCount = Math.floor(count * 0.05);
  const cityCount = Math.floor(count * 0.025);
  const arcCount = count - surfaceCount - atmoCount - cityCount;

  // Surface: fibonacci lattice, land kept, ocean thinned, far side thinned.
  const golden = Math.PI * (3 - Math.sqrt(5));
  const candidates = Math.ceil(surfaceCount * 7);
  const stride = 7919;
  for (let k = 0; k < candidates && i < surfaceCount; k++) {
    const idx = (k * stride) % candidates;
    const y = 1 - ((idx + 0.5) / candidates) * 2;
    const rr = Math.sqrt(1 - y * y);
    const th = golden * idx;
    const v: V3 = [Math.cos(th) * rr, y, Math.sin(th) * rr];
    const lat = Math.asin(y) / DEG;
    const lon = Math.atan2(v[0], v[2]) / DEG;
    const land = isLand(lon, lat);
    if (!land && rand() > OCEAN_KEEP) continue;
    if (land) {
      const coast =
        !isLand(lon + COAST_PROBE_DEG, lat) || !isLand(lon - COAST_PROBE_DEG, lat) || !isLand(lon, lat + COAST_PROBE_DEG) || !isLand(lon, lat - COAST_PROBE_DEG);
      if (!coast && rand() > INLAND_KEEP) continue;
    }
    if (rotate(v)[2] < -0.1 && rand() > BACKSIDE_KEEP) continue;
    // Tiny relief jitter so the coastline feels alive rather than ruled.
    put(v, 1 + (land ? 0.006 : 0) + (rand() - 0.5) * 0.004);
  }
  while (i < surfaceCount) put(normalize([gauss(rand), gauss(rand), gauss(rand)]));

  // Atmosphere shell.
  for (let n = 0; n < atmoCount; n++) {
    const v = normalize([gauss(rand), gauss(rand), gauss(rand)]);
    if (rotate(v)[2] < -0.2 && rand() > 0.4) {
      n--;
      continue;
    }
    put(v, 1.04 + rand() * 0.07);
  }

  // City markers: dense clusters.
  const cities = [BANGALORE, BOSTON];
  for (let n = 0; n < cityCount; n++) {
    const c = cities[n % 2];
    const base = toVec(c.lat, c.lon);
    const g = 0.012;
    put(normalize([base[0] + gauss(rand) * g, base[1] + gauss(rand) * g, base[2] + gauss(rand) * g]), 1.012 + rand() * 0.01);
  }

  // Arc: slerp with a sine lift, thickest near the endpoints.
  const a = toVec(BANGALORE.lat, BANGALORE.lon);
  const b = toVec(BOSTON.lat, BOSTON.lon);
  const omega = Math.acos(Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const so = Math.sin(omega);
  for (let n = 0; n < arcCount; n++) {
    const t = rand();
    const wa = Math.sin((1 - t) * omega) / so;
    const wb = Math.sin(t * omega) / so;
    const base = normalize([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]);
    const lift = 1.01 + ARC_LIFT * Math.pow(Math.sin(Math.PI * t), 0.9);
    const spread = 0.0022 + 0.003 * (1 - Math.sin(Math.PI * t));
    const v = normalize([base[0] + gauss(rand) * spread, base[1] + gauss(rand) * spread, base[2] + gauss(rand) * spread]);
    put(v, lift + gauss(rand) * 0.0025);
  }
  while (i < count) put(normalize([gauss(rand), gauss(rand), gauss(rand)]), 1.05);
  return out;
}
