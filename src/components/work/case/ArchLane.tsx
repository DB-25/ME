"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { pad } from "../meta";

const COL_W = 300;
const ROW_GAP = 200;
const TOP = 44;
const WAVE = 24;
const TURN = 112;
const LABEL_DY = 50;
const LINE_H = 27;
const LABEL_PAD = 24;
const TURN_LABEL_X = 30;
/** Steps per Bezier segment when measuring the path in plain JS (no SVG DOM calls). */
const SEGMENT_STEPS = 40;
const PACKETS = 4;

type Pt = { x: number; y: number };
type Bezier = [Pt, Pt, Pt, Pt];
type Geometry = { w: number; h: number; pts: Pt[]; d: string; side: number[]; segs: Bezier[] };

/** The path sampled once, in arc length: node positions and packet positions are lookups, never getPointAtLength. */
type Track = { total: number; len: Float32Array; xy: Float32Array; at: number[] };

function bezierAt([a, c1, c2, b]: Bezier, t: number): Pt {
  const u = 1 - t;
  const w0 = u * u * u;
  const w1 = 3 * u * u * t;
  const w2 = 3 * u * t * t;
  const w3 = t * t * t;
  return { x: w0 * a.x + w1 * c1.x + w2 * c2.x + w3 * b.x, y: w0 * a.y + w1 * c1.y + w2 * c2.y + w3 * b.y };
}

function buildTrack(segs: Bezier[]): Track {
  const n = segs.length * SEGMENT_STEPS + 1;
  const len = new Float32Array(n);
  const xy = new Float32Array(n * 2);
  const at = [0];
  let prev = segs[0][0];
  xy[0] = prev.x;
  xy[1] = prev.y;
  let k = 1;
  for (const seg of segs) {
    for (let s = 1; s <= SEGMENT_STEPS; s++, k++) {
      const q = bezierAt(seg, s / SEGMENT_STEPS);
      len[k] = len[k - 1] + Math.hypot(q.x - prev.x, q.y - prev.y);
      xy[k * 2] = q.x;
      xy[k * 2 + 1] = q.y;
      prev = q;
    }
    at.push(len[k - 1]);
  }
  const total = len[n - 1] || 1;
  return { total, len, xy, at: at.map((l) => l / total) };
}

/** Point at fraction f (0..1) of the track's length, linear between samples. */
function trackPoint(track: Track, f: number, out: Pt): Pt {
  const { len, xy, total } = track;
  const target = Math.min(Math.max(f, 0), 1) * total;
  let lo = 0;
  let hi = len.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (len[mid] <= target) lo = mid;
    else hi = mid;
  }
  const span = len[hi] - len[lo] || 1;
  const m = (target - len[lo]) / span;
  out.x = xy[lo * 2] + (xy[hi * 2] - xy[lo * 2]) * m;
  out.y = xy[lo * 2 + 1] + (xy[hi * 2 + 1] - xy[lo * 2 + 1]) * m;
  return out;
}

function colsFor(width: number) {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  return 4;
}

function wrap(text: string, max: number): string[] {
  const lines: string[] = [];
  let cur = "";
  for (const word of text.split(" ")) {
    if (cur && (cur + " " + word).length > max) {
      lines.push(cur);
      cur = word;
    } else cur = cur ? `${cur} ${word}` : word;
  }
  if (cur) lines.push(cur);
  return lines;
}

/**
 * Snake layout: nodes run left to right, then right to left, joined by one continuous path.
 * `side[i]` is +1/-1 for the nodes the path turns around (last of a row, first of the next), else 0: their
 * labels hang inward so the turn curve, which bulges outward, never crosses a label.
 */
function buildGeometry(labelLines: number[], cols: number): Geometry {
  const n = labelLines.length;
  const rows = Math.ceil(n / cols);
  const w = Math.min(n, cols) * COL_W;
  const dirOf = (row: number) => (row % 2 === 0 ? 1 : -1);
  const pts = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const col = r % 2 === 0 ? c : cols - 1 - c;
    return { x: COL_W / 2 + col * COL_W, y: TOP + r * ROW_GAP };
  });
  const side = pts.map((_, i) => {
    const r = Math.floor(i / cols);
    const lastOfRow = i % cols === cols - 1 && i < n - 1;
    const firstOfRow = i % cols === 0 && r > 0;
    if (lastOfRow) return dirOf(r);
    if (firstOfRow) return dirOf(r - 1);
    return 0;
  });
  let d = `M ${pts[0].x} ${pts[0].y}`;
  const segs: Bezier[] = [];
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const sameRow = Math.floor((i - 1) / cols) === Math.floor(i / cols);
    if (sameRow) {
      const dir = Math.sign(b.x - a.x) || 1;
      const k = (i % 2 === 0 ? 1 : -1) * WAVE;
      const c1 = { x: a.x + dir * 110, y: a.y + k };
      const c2 = { x: b.x - dir * 110, y: b.y - k };
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
      segs.push([a, c1, c2, b]);
    } else {
      const out = dirOf(Math.floor((i - 1) / cols)) * TURN * 1.33;
      const c1 = { x: a.x + out, y: a.y };
      const c2 = { x: b.x + out, y: b.y };
      d += ` C ${c1.x} ${c1.y}, ${c2.x} ${c2.y}, ${b.x} ${b.y}`;
      segs.push([a, c1, c2, b]);
    }
  }
  const lastRowLines = Math.max(...labelLines.slice((rows - 1) * cols));
  return { w, h: TOP + (rows - 1) * ROW_GAP + LABEL_DY + (lastRowLines - 1) * LINE_H + LABEL_PAD, pts, d, side, segs };
}

/** One pipeline drawn as a metro line: it traces itself as you scroll, nodes light as it arrives, data flows through. */
export function ArchLane({ nodes, label }: { nodes: string[]; label: string }) {
  const uid = useId().replace(/:/g, "");
  const [cols, setCols] = useState(4);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const labels = useMemo(() => {
    const geo = buildGeometry(nodes.map(() => 1), cols);
    return nodes.map((t, i) => wrap(t, geo.side[i] ? 15 : cols === 2 ? 17 : 22));
  }, [nodes, cols]);
  const geo = useMemo(() => buildGeometry(labels.map((l) => l.length), cols), [labels, cols]);

  useEffect(() => {
    const sync = () => setCols(colsFor(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const wrapEl = wrapRef.current;
    if (!svg || !wrapEl) return;
    const maskPath = svg.querySelector<SVGPathElement>(".cs-mask-path");
    const nodeEls = [...svg.querySelectorAll<SVGGElement>(".cs-node")];
    const pulses = [...svg.querySelectorAll<SVGCircleElement>(".cs-pulse")];
    const glows = [...svg.querySelectorAll<SVGCircleElement>(".cs-glow")];
    const packets = [...svg.querySelectorAll<SVGCircleElement>(".cs-packet")];
    if (!maskPath || geo.segs.length === 0) return;

    if (prefersReducedMotion()) {
      gsap.set(maskPath, { strokeDashoffset: 0 });
      gsap.set(nodeEls, { opacity: 1 });
      // The glow is a soft halo, not a filled disc: it needs the same resting opacity the scrubbed timeline ends on.
      gsap.set(glows, { opacity: 0.14 });
      gsap.set(pulses, { opacity: 0 });
      gsap.set(packets, { opacity: 0 });
      return;
    }

    // Where along the path does each node sit (as 0..1 of total length)? Measured once, in JS.
    const track = buildTrack(geo.segs);
    const at = track.at;

    let drawn = 0;
    const ctx = gsap.context(() => {
      gsap.set(nodeEls, { opacity: 0.22 });
      gsap.set(glows, { opacity: 0 });
      gsap.set(pulses, { opacity: 0, transformOrigin: "50% 50%" });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrapEl,
          start: "top 78%",
          // Finishes while the diagram is still well on screen, so the last nodes are lit at rest.
          end: "bottom 78%",
          scrub: 0.7,
          onUpdate: (self) => {
            drawn = self.progress;
          },
        },
      });
      tl.fromTo(maskPath, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1 }, 0);
      nodeEls.forEach((el, i) => {
        const t = Math.min(at[i], 0.96);
        tl.to(el, { opacity: 1, duration: 0.04 }, t);
        tl.to(glows[i], { opacity: 0.14, duration: 0.05 }, t);
        tl.fromTo(pulses[i], { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 2.6, duration: 0.07, immediateRender: false }, t);
      });
      // A tail past the last node so the scrub always ends fully resolved.
      tl.to({}, { duration: 0.001 }, 1.04);
    }, wrapEl);

    // Packets ride the portion of the line that has been drawn so far.
    const state = { t: 0 };
    const q: Pt = { x: 0, y: 0 };
    const tick = (_: number, dt: number) => {
      state.t += dt / 1000;
      if (drawn < 0.02) {
        packets.forEach((p) => p.setAttribute("opacity", "0"));
        return;
      }
      const reach = Math.min(drawn, 1);
      packets.forEach((p, k) => {
        const f = (state.t * 0.12 + k / PACKETS) % 1;
        trackPoint(track, f * reach, q);
        p.setAttribute("cx", String(q.x));
        p.setAttribute("cy", String(q.y));
        p.setAttribute("opacity", String(Math.sin(f * Math.PI) * 0.95));
      });
    };
    // Only tick while the lane is on screen.
    let ticking = false;
    const setTicking = (on: boolean) => {
      if (on === ticking) return;
      ticking = on;
      if (on) gsap.ticker.add(tick);
      else gsap.ticker.remove(tick);
    };
    const io = new IntersectionObserver((entries) => setTicking(entries.some((e) => e.isIntersecting)));
    io.observe(wrapEl);
    return () => {
      io.disconnect();
      setTicking(false);
      ctx.revert();
    };
  }, [geo]);

  const maskId = `mask-${uid}`;
  const last = geo.pts.length - 1;

  return (
    <div ref={wrapRef} className="cs-arch">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${geo.w} ${geo.h}`}
        role="img"
        aria-label={`${label}: ${nodes.join(", then ")}.`}
        className="cs-arch-svg"
        preserveAspectRatio="xMidYMin meet"
      >
        <defs>
          <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width={geo.w} height={geo.h}>
            <path className="cs-mask-path" d={geo.d} fill="none" stroke="#fff" strokeWidth="10" pathLength={1} strokeDasharray="1" strokeDashoffset="1" />
          </mask>
        </defs>

        <path className="cs-track" d={geo.d} fill="none" />
        <g mask={`url(#${maskId})`}>
          <path className="cs-line" d={geo.d} fill="none" />
          <path className="cs-flow" d={geo.d} fill="none" />
        </g>

        {/* Packets sit under the nodes, so one passing through a ring is hidden by it instead of reading as a stray dot. */}
        {Array.from({ length: PACKETS }, (_, k) => (
          <circle key={k} className="cs-packet" r="3.5" opacity="0" />
        ))}

        {geo.pts.map((p, i) => {
          const s = geo.side[i];
          return (
            <g key={i} className="cs-node" transform={`translate(${p.x} ${p.y})`}>
              <circle className="cs-glow" r="34" />
              <circle className="cs-pulse" r="19" />
              <circle className={i === 0 || i === last ? "cs-ring cs-ring-end" : "cs-ring"} r="19" />
              <text className="cs-node-n" textAnchor="middle" dy="4">
                {pad(i + 1)}
              </text>
              <text className="cs-node-label" textAnchor={s > 0 ? "end" : s < 0 ? "start" : "middle"} x={s * TURN_LABEL_X} y={LABEL_DY}>
                {labels[i].map((line, li) => (
                  <tspan key={li} x={s * TURN_LABEL_X} dy={li === 0 ? 0 : LINE_H}>
                    {line}
                  </tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
