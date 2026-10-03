/**
 * Hand-made line art for the scripted tour. Every drawing is a single-weight
 * outline in a 512 x 512 viewBox, the same shape language the live model is
 * asked to use, so the particle sampler treats both identically.
 *
 * Rules: one stroke width, round caps and joins, nothing filled, no two
 * strokes closer than a stroke width (they would fuse into one blob of
 * particles). Nothing is opaque, so wherever one shape sits in front of
 * another, the hidden part of the far outline is cut away by `trace`
 * (dropping any scrap shorter than `minLen`, which would read as a stray dash).
 */

const STROKE = 12;
/** Extra clearance around a shape that hides a line behind it. */
const HIDE_GAP = 15;

/** Paint lives on a <g>: the sampler strips every attribute on the root <svg>. */
const wrap = (body: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><g fill="none" stroke="#fff" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${body}</g></svg>`;

const f = (n: number) => String(Math.round(n * 10) / 10);
const path = (d: string) => `<path d="${d}"/>`;
const line = (x1: number, y1: number, x2: number, y2: number) => path(`M${f(x1)} ${f(y1)} L${f(x2)} ${f(y2)}`);
const circle = (cx: number, cy: number, r: number) => `<circle cx="${f(cx)}" cy="${f(cy)}" r="${f(r)}"/>`;
const polyline = (pts: Array<[number, number]>) => path(pts.map(([x, y], i) => `${i ? "L" : "M"}${f(x)} ${f(y)}`).join(" "));

type Point = [number, number];
type Disc = { x: number; y: number; r: number };
/** What can hide a line: a disc (with clearance around it) or any region given as a test. */
type Hider = Disc | ((p: Point) => boolean);

const polar = (cx: number, cy: number, r: number, deg: number): Point => {
  const a = (deg * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};

/** Circular arc between two angles (degrees, clockwise on screen). */
function arc(cx: number, cy: number, r: number, from: number, to: number): string {
  const [x1, y1] = polar(cx, cy, r, from);
  const [x2, y2] = polar(cx, cy, r, to);
  const sweep = (((to - from) % 360) + 360) % 360;
  return path(`M${f(x1)} ${f(y1)} A${r} ${r} 0 ${sweep > 180 ? 1 : 0} 1 ${f(x2)} ${f(y2)}`);
}

/**
 * Walk a curve by angle and keep only the runs that fall outside every
 * hiding disc. This is how a near shape "covers" a far one with no fill.
 */
function trace(at: (deg: number) => Point, from: number, to: number, hides: Hider[] = [], step = 3, minLen = 0): string {
  const covered = (p: Point) =>
    hides.some((h) => (typeof h === "function" ? h(p) : Math.hypot(p[0] - h.x, p[1] - h.y) < h.r + HIDE_GAP));
  const runs: Point[][] = [];
  let run: Point[] = [];
  for (let deg = from; deg <= to + 1e-6; deg += step) {
    const p = at(deg);
    if (covered(p)) {
      if (run.length) runs.push(run);
      run = [];
    } else run.push(p);
  }
  if (run.length) runs.push(run);
  const length = (r: Point[]) => r.reduce((sum, p, i) => (i ? sum + Math.hypot(p[0] - r[i - 1][0], p[1] - r[i - 1][1]) : 0), 0);
  return runs.filter((r) => r.length > 1 && length(r) >= minLen).map((r) => polyline(r)).join("");
}

const ringAt = (d: Disc) => (deg: number) => polar(d.x, d.y, d.r, deg);
const ellipseAt = (cx: number, cy: number, rx: number, ry: number) => (deg: number): Point => {
  const a = (deg * Math.PI) / 180;
  return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
};

/* ---------- pani puri ---------- */

/** A whole puri: a ball, cut where nearer things cover it, with a short sheen stroke. */
function puri(d: Disc, hides: Hider[] = []): string {
  const [sx, sy] = polar(d.x, d.y, d.r * 0.56, 200);
  const [ex, ey] = polar(d.x, d.y, d.r * 0.56, 245);
  return (
    trace(ringAt(d), 0, 360, hides, 4, 30) +
    path(`M${f(sx)} ${f(sy)} A${f(d.r * 0.56)} ${f(d.r * 0.56)} 0 0 1 ${f(ex)} ${f(ey)}`)
  );
}

/** A puri tapped open: a torn rim, and filling heaped above it. */
function crackedPuri(d: Disc, hides: Hider[] = []): string {
  const { x, y, r } = d;
  const rim: Point[] = [
    [x + r * 0.88, y - r * 0.48],
    [x + r * 0.34, y - r * 0.9],
    [x + r * 0.08, y - r * 0.56],
    [x - r * 0.3, y - r * 0.9],
    [x - r * 0.88, y - r * 0.48],
  ];
  const heap =
    circle(x - r * 0.4, y - r * 1.42, 11) + circle(x + r * 0.34, y - r * 1.38, 10) + circle(x - r * 0.04, y - r * 1.92, 9);
  // The shell is the whole circle but for the opening, which spans -151 to -29 degrees.
  return trace(ringAt(d), 331.4, 568.6, hides, 4, 30) + polyline(rim) + heap;
}

/** The bowl: a shallow ellipse seen at an angle, a body that tapers to a foot, puris heaped inside. */
function paniPuri(): string {
  const bowl = { x: 190, y: 400, rx: 160, ry: 40 };
  const frontRimY = (x: number) => bowl.y + bowl.ry * Math.sqrt(Math.max(0, 1 - ((x - bowl.x) / bowl.rx) ** 2));
  /** Anything just above the front lip or below it is behind the bowl's wall, so it is cut. */
  const insideWall = ([x, y]: Point) => Math.abs(x - bowl.x) < bowl.rx && y > frontRimY(x) - 10;

  const front: Disc[] = [
    { x: 96, y: 402, r: 34 },
    { x: 190, y: 402, r: 34 },
    { x: 284, y: 402, r: 34 },
  ];
  const middle: Disc[] = [
    { x: 143, y: 336, r: 34 },
    { x: 237, y: 336, r: 34 },
  ];
  const top: Disc = { x: 190, y: 268, r: 38 };

  const bowlBody = path(
    `M${bowl.x - bowl.rx} ${bowl.y} C${bowl.x - bowl.rx + 6} ${bowl.y + 58} ${bowl.x - 100} 494 ${bowl.x - 56} 494 H${bowl.x + 56} C${bowl.x + 100} 494 ${bowl.x + bowl.rx - 6} ${bowl.y + 58} ${bowl.x + bowl.rx} ${bowl.y}`,
  );

  /* the pani, in a separate cup, with a few strokes rising off it */
  const cup =
    `<ellipse cx="424" cy="428" rx="42" ry="10"/>` +
    path("M382 428 L394 498 H454 L466 428") +
    path("M398 450 Q424 462 450 450") +
    path("M404 398 Q394 384 404 370") +
    path("M424 392 Q434 376 424 360") +
    path("M444 398 Q434 384 444 370");

  return (
    /* back rim, cut where puris stand in front of it; the front lip is whole */
    trace(ellipseAt(bowl.x, bowl.y, bowl.rx, bowl.ry), 180, 360, [...front, ...middle, top], 3, 36) +
    trace(ellipseAt(bowl.x, bowl.y, bowl.rx, bowl.ry), 0, 180, [], 3) +
    bowlBody +
    crackedPuri(top) +
    middle.map((d) => puri(d)).join("") +
    front.map((d) => puri(d, [insideWall])).join("") +
    cup
  );
}

/* ---------- crosshair ---------- */

function crosshair(): string {
  const c = 256;
  const ring = [0, 90, 180, 270].map((q) => arc(c, c, 150, q + 16, q + 74)).join("");
  const inner = [45, 135, 225, 315].map((q) => arc(c, c, 100, q - 12, q + 12)).join("");
  const ticks = [0, 90, 180, 270]
    .map((q) => {
      const [x1, y1] = polar(c, c, 40, q);
      const [x2, y2] = polar(c, c, 80, q);
      const [x3, y3] = polar(c, c, 186, q);
      const [x4, y4] = polar(c, c, 224, q);
      return line(x1, y1, x2, y2) + line(x3, y3, x4, y4);
    })
    .join("");
  return ring + inner + ticks + circle(c, c, 2);
}

/* ---------- lightbulb ---------- */

function lightbulb(): string {
  const [cx, cy, r] = [256, 214, 100];
  const [lx, ly] = polar(cx, cy, r, 142);
  const [rx, ry] = polar(cx, cy, r, 38);
  const rays = [270, 225, 315, 180, 360]
    .map((deg) => {
      const [x1, y1] = polar(cx, cy, r + 30, deg);
      const [x2, y2] = polar(cx, cy, r + 62, deg);
      return line(x1, y1, x2, y2);
    })
    .join("");
  return (
    arc(cx, cy, r, 142, 398) +
    path(`M${f(lx)} ${f(ly)} C${f(lx + 14)} ${f(ly + 34)} 196 330 196 352`) +
    path(`M${f(rx)} ${f(ry)} C${f(rx - 14)} ${f(ry + 34)} 316 330 316 352`) +
    line(196, 352, 316, 352) +
    line(204, 388, 308, 388) +
    line(214, 424, 298, 424) +
    path("M232 352 L236 272 Q256 224 276 272 L280 352") +
    rays
  );
}

/* ---------- results with receipts ---------- */

const CHART =
  path("M72 72 V432 H452") +
  path("M132 432 V344 H200 V432") +
  path("M236 432 V276 H304 V432") +
  path("M340 432 V196 H408 V432") +
  circle(172, 168, 56) +
  polyline([
    [148, 168],
    [166, 188],
    [200, 146],
  ]);

/* ---------- bridge ---------- */

function bridge(): string {
  const [towerL, towerR, top, deck] = [150, 362, 108, 322];
  const cable = (t: number): Point => [
    towerL + (towerR - towerL) * t,
    (1 - t) ** 2 * top + 2 * t * (1 - t) * 300 + t ** 2 * top,
  ];
  const curve = Array.from({ length: 41 }, (_, i) => cable(i / 40));
  const hangers = [0.3, 0.5, 0.7]
    .map((t) => {
      const [x, y] = cable(t);
      return line(x, y, x, deck);
    })
    .join("");
  const tower = (x: number) =>
    line(x - 30, top, x - 30, 412) + line(x + 30, top, x + 30, 412) + line(x - 30, top, x + 30, top);
  return (
    polyline(curve) +
    line(towerL, top, 24, deck - 4) +
    line(towerR, top, 488, deck - 4) +
    hangers +
    line(24, deck, 488, deck) +
    tower(towerL) +
    tower(towerR) +
    path("M24 458 q32 -24 64 0 t64 0 t64 0 t64 0 t64 0 t64 0 t64 0")
  );
}

/* ---------- documents in, plain language out ---------- */

const page = (x: number) =>
  path(`M${x} 100 H${x + 112} L${x + 154} 142 V412 H${x} Z`) + path(`M${x + 112} 100 V142 H${x + 154}`);

const DOCUMENTS =
  page(54) +
  [190, 224, 258, 292, 326].map((y) => line(86, y, 176, y)).join("") +
  line(226, 256, 282, 256) +
  polyline([
    [262, 234],
    [284, 256],
    [262, 278],
  ]) +
  page(308) +
  line(340, 206, 408, 206) +
  line(340, 254, 424, 254) +
  circle(382, 340, 34) +
  polyline([
    [364, 340],
    [378, 354],
    [402, 326],
  ]);

/* ---------- bezier ---------- */

const BEZIER =
  path("M92 396 C250 388 250 124 420 116") +
  path("M92 396 L250 388 M420 116 L250 124") +
  `<rect x="72" y="376" width="40" height="40" rx="6"/>` +
  `<rect x="400" y="96" width="40" height="40" rx="6"/>` +
  circle(262, 386, 16) +
  circle(238, 126, 16);

/* ---------- stairs ---------- */

const STAIRS =
  path("M50 448 H462 V168 H378 V238 H294 V308 H210 V378 H126 V448") +
  line(420, 168, 420, 84) +
  path("M420 84 L474 106 L420 128");

/* ---------- signal: noise resolving into a clean wave ---------- */

function signal(): string {
  const noise = (i: number, k: number) => {
    const s = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
    return (s - Math.floor(s)) * 2 - 1;
  };
  const smooth = (t: number) => t * t * (3 - 2 * t);
  const wave = (y0: number, phase: number, k: number): string => {
    const pts: Point[] = [];
    for (let i = 0; i <= 72; i++) {
      const x = 40 + i * 6;
      const settle = smooth(Math.min(1, Math.max(0, (x - 60) / 270)));
      const clean = 28 * Math.sin(((x - 40) / 432) * Math.PI * 4.4 + phase);
      pts.push([x, y0 + clean + (1 - settle) * 40 * noise(i, k)]);
    }
    return polyline(pts);
  };
  return wave(136, 0, 1) + wave(256, 1.2, 2) + wave(376, 2.4, 3);
}

/* ---------- stack: infrastructure that stays up ---------- */

const STACK =
  [92, 214, 336].map((y) => `<rect x="96" y="${y}" width="320" height="86" rx="20"/>`).join("") +
  line(150, 178, 150, 214) +
  line(362, 178, 362, 214) +
  line(150, 300, 150, 336) +
  line(362, 300, 362, 336) +
  polyline([
    [136, 135],
    [220, 135],
    [238, 112],
    [260, 158],
    [278, 135],
    [376, 135],
  ]) +
  circle(138, 257, 9) +
  line(188, 257, 300, 257) +
  circle(138, 379, 9) +
  line(188, 379, 252, 379) +
  line(328, 379, 376, 379);

export const ART = {
  paniPuri: wrap(paniPuri()),
  crosshair: wrap(crosshair()),
  lightbulb: wrap(lightbulb()),
  chart: wrap(CHART),
  bridge: wrap(bridge()),
  documents: wrap(DOCUMENTS),
  bezier: wrap(BEZIER),
  stairs: wrap(STAIRS),
  signal: wrap(signal()),
  stack: wrap(STACK),
} as const;

export type ArtId = keyof typeof ART;
