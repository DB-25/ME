import { isLand } from "./landmask";
import { gauss, mulberry32 } from "./rng";
import { particleSeeds } from "./seeds";
import {
  ARC_LIFT,
  ARC_SHARE,
  ATMO_SHARE,
  BANGALORE,
  BOSTON,
  CITY_SHARE,
  DEG,
  GLOBE_R as R,
  defaultBasis,
  dot,
  normalize,
  toVec,
  type V3,
} from "./globeView";

/** Ocean points kept relative to land points. */
const OCEAN_KEEP = 0.04;
/** Land away from a coast is thinned a little so coastlines read as bright contours. */
const INLAND_KEEP = 0.5;
const COAST_PROBE_DEG = 2.4;
/** City markers: a tight bright core plus a wider halo, in radians on the unit sphere. */
const CITY_CORE = 0.006;
const CITY_HALO = 0.022;
const CITY_CORE_SHARE = 0.4;

/**
 * Point-cloud Earth (land dense, ocean sparse), uniform over the whole sphere (the shader hides the far side
 * for whatever view the story is in), baked in the default view.
 *
 * Particle roles come from the deterministic per-particle seeds the shader reads (`aRand`), so the
 * formation is NOT shuffled: x < ARC_SHARE is an arc particle at arc position t = w, the next CITY_SHARE
 * are city markers (w < 0.5 is Bangalore, else Boston), everything else is surface or atmosphere.
 */
export function globeFormation(count: number): Float32Array {
  const rand = mulberry32(4242);
  const seeds = particleSeeds(count);
  const out = new Float32Array(count * 3);
  const basis = defaultBasis();
  const put = (slot: number, v: V3, scale = 1) => {
    out[slot * 3] = dot(v, basis.right) * R * scale;
    out[slot * 3 + 1] = dot(v, basis.up) * R * scale;
    out[slot * 3 + 2] = dot(v, basis.forward) * R * scale;
  };

  const a = toVec(BANGALORE.lat, BANGALORE.lon);
  const b = toVec(BOSTON.lat, BOSTON.lon);
  const omega = Math.acos(Math.min(1, dot(a, b)));
  const so = Math.sin(omega);

  const others: number[] = [];
  for (let i = 0; i < count; i++) {
    const x = seeds[i * 4];
    const w = seeds[i * 4 + 3];
    if (x < ARC_SHARE) {
      // Arc: slerp with a sine lift, thickest near the endpoints. Bangalore is t = 0.
      const wa = Math.sin((1 - w) * omega) / so;
      const wb = Math.sin(w * omega) / so;
      const base = normalize([a[0] * wa + b[0] * wb, a[1] * wa + b[1] * wb, a[2] * wa + b[2] * wb]);
      const lift = 1.01 + ARC_LIFT * Math.pow(Math.sin(Math.PI * w), 0.9);
      const spread = 0.0022 + 0.003 * (1 - Math.sin(Math.PI * w));
      const v = normalize([base[0] + gauss(rand) * spread, base[1] + gauss(rand) * spread, base[2] + gauss(rand) * spread]);
      put(i, v, lift + gauss(rand) * 0.0025);
    } else if (x < ARC_SHARE + CITY_SHARE) {
      const base = w < 0.5 ? a : b;
      const g = rand() < CITY_CORE_SHARE ? CITY_CORE : CITY_HALO;
      put(i, normalize([base[0] + gauss(rand) * g, base[1] + gauss(rand) * g, base[2] + gauss(rand) * g]), 1.012 + rand() * 0.01);
    } else {
      others.push(i);
    }
  }

  // Surface (fibonacci lattice, land kept, ocean thinned) and atmosphere shell go to the remaining slots in random order.
  const atmoCount = Math.floor(others.length * ATMO_SHARE);
  const surfaceCount = others.length - atmoCount;
  const order = new Uint32Array(others.length);
  for (let k = 0; k < order.length; k++) order[k] = k;
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    const t = order[k];
    order[k] = order[j];
    order[j] = t;
  }
  let n = 0;
  const next = () => others[order[n++]];

  const golden = Math.PI * (3 - Math.sqrt(5));
  const candidates = Math.ceil(surfaceCount * 7);
  const stride = 7919;
  let placed = 0;
  for (let k = 0; k < candidates && placed < surfaceCount; k++) {
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
    // Tiny relief jitter so the coastline feels alive rather than ruled.
    put(next(), v, 1 + (land ? 0.006 : 0) + (rand() - 0.5) * 0.004);
    placed++;
  }
  while (placed < surfaceCount) {
    put(next(), normalize([gauss(rand), gauss(rand), gauss(rand)]));
    placed++;
  }
  while (n < others.length) put(next(), normalize([gauss(rand), gauss(rand), gauss(rand)]), 1.04 + rand() * 0.07);
  return out;
}
