"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { Project } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { pad } from "../meta";
import { CaseLabel } from "./CaseLabel";

const COL_W = 300;
const ROW_GAP = 236;
const TOP = 96;
const WAVE = 24;
const LABEL_DY = 50;
const LINE_H = 27;
const SAMPLES = 700;
const PACKETS = 4;

type Geometry = { w: number; h: number; pts: { x: number; y: number }[]; d: string };

function colsFor(width: number) {
  if (width < 640) return 2;
  if (width < 1024) return 3;
  return 4;
}

/** Snake layout: nodes run left to right, then right to left, joined by one continuous path. */
function buildGeometry(n: number, cols: number): Geometry {
  const rows = Math.ceil(n / cols);
  const w = Math.min(n, cols) * COL_W;
  const pts = Array.from({ length: n }, (_, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const col = r % 2 === 0 ? c : cols - 1 - c;
    return { x: COL_W / 2 + col * COL_W, y: TOP + r * ROW_GAP };
  });
  const R = ROW_GAP / 2;
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < n; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const sameRow = Math.floor((i - 1) / cols) === Math.floor(i / cols);
    if (sameRow) {
      const dir = Math.sign(b.x - a.x) || 1;
      const k = (i % 2 === 0 ? 1 : -1) * WAVE;
      d += ` C ${a.x + dir * 110} ${a.y + k}, ${b.x - dir * 110} ${b.y - k}, ${b.x} ${b.y}`;
    } else {
      const out = Math.floor((i - 1) / cols) % 2 === 0 ? 1 : -1;
      d += ` C ${a.x + out * R * 1.36} ${a.y}, ${b.x + out * R * 1.36} ${b.y}, ${b.x} ${b.y}`;
    }
  }
  return { w, h: TOP + (rows - 1) * ROW_GAP + LABEL_DY + 3 * LINE_H + 30, pts, d };
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

/** A pipeline drawn as a metro line: it traces itself as you scroll, nodes light as it arrives, data flows through. */
export function ArchitectureDiagram({ project, n }: { project: Project; n: string }) {
  const arch = project.architecture;
  const uid = useId().replace(/:/g, "");
  const [cols, setCols] = useState(4);
  const wrapRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const nodes = useMemo(() => arch?.nodes ?? [], [arch]);
  const geo = useMemo(() => (nodes.length ? buildGeometry(nodes.length, cols) : null), [nodes, cols]);

  useEffect(() => {
    const sync = () => setCols(colsFor(window.innerWidth));
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, []);

  useEffect(() => {
    const svg = svgRef.current;
    const wrapEl = wrapRef.current;
    if (!svg || !wrapEl || !geo) return;
    const track = svg.querySelector<SVGPathElement>(".cs-track");
    const maskPath = svg.querySelector<SVGPathElement>(".cs-mask-path");
    const nodeEls = [...svg.querySelectorAll<SVGGElement>(".cs-node")];
    const pulses = [...svg.querySelectorAll<SVGCircleElement>(".cs-pulse")];
    const glows = [...svg.querySelectorAll<SVGCircleElement>(".cs-glow")];
    const packets = [...svg.querySelectorAll<SVGCircleElement>(".cs-packet")];
    if (!track || !maskPath) return;

    if (prefersReducedMotion()) {
      gsap.set(maskPath, { strokeDashoffset: 0 });
      gsap.set(nodeEls, { opacity: 1 });
      gsap.set(packets, { opacity: 0 });
      return;
    }

    // Where along the path does each node sit (as 0..1 of total length)?
    const total = track.getTotalLength();
    const at: number[] = [];
    let cursor = 0;
    geo.pts.forEach((p, i) => {
      if (i === 0) return at.push(0);
      let best = cursor;
      let bestD = Infinity;
      for (let s = cursor; s <= SAMPLES; s++) {
        const q = track.getPointAtLength((s / SAMPLES) * total);
        const dd = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (dd < bestD) {
          bestD = dd;
          best = s;
        }
      }
      cursor = best;
      at.push(best / SAMPLES);
    });

    let drawn = 0;
    const ctx = gsap.context(() => {
      gsap.set(nodeEls, { opacity: 0.22 });
      gsap.set(glows, { opacity: 0 });
      gsap.set(pulses, { opacity: 0, transformOrigin: "50% 50%" });
      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: wrapEl,
          start: "top 72%",
          end: "bottom 62%",
          scrub: 0.7,
          onUpdate: (self) => {
            drawn = self.progress;
          },
        },
      });
      tl.fromTo(maskPath, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: 1 }, 0);
      nodeEls.forEach((el, i) => {
        const t = Math.min(at[i], 0.985);
        tl.to(el, { opacity: 1, duration: 0.04 }, t);
        tl.to(glows[i], { opacity: 0.14, duration: 0.05 }, t);
        tl.fromTo(pulses[i], { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 2.6, duration: 0.07 }, t);
      });
    }, wrapEl);

    // Packets ride the portion of the line that has been drawn so far.
    const state = { t: 0 };
    const tick = (_: number, dt: number) => {
      state.t += dt / 1000;
      if (drawn < 0.02) {
        packets.forEach((p) => p.setAttribute("opacity", "0"));
        return;
      }
      packets.forEach((p, k) => {
        const f = (state.t * 0.12 + k / PACKETS) % 1;
        const q = track.getPointAtLength(f * drawn * total);
        p.setAttribute("cx", String(q.x));
        p.setAttribute("cy", String(q.y));
        p.setAttribute("opacity", String(Math.sin(f * Math.PI) * 0.95));
      });
    };
    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      ctx.revert();
    };
  }, [geo]);

  if (!arch || !geo) return null;
  const maxChars = cols === 2 ? 17 : 22;
  const maskId = `mask-${uid}`;

  return (
    <section className="cs-section" data-cs="architecture" data-cs-label="Architecture" aria-labelledby="cs-arch">
      <div className="shell">
        <div className="grid-12 cs-split">
          <div className="col-span-12 md:col-span-4">
            <CaseLabel n={n} text="Architecture" />
            <h2 id="cs-arch" className="headline cs-h2 mt-6">
              <Reveal as="span" className="block">
                How it <Emph>flows</Emph>
              </Reveal>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-6 md:col-start-6">
            <Reveal mode="fade">
              <p className="lede">{arch.flow}</p>
            </Reveal>
          </div>
        </div>

        <div ref={wrapRef} className="cs-arch">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${geo.w} ${geo.h}`}
            role="img"
            aria-label={`Architecture of ${project.name}: ${nodes.join(", then ")}.`}
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

            {geo.pts.map((p, i) => (
              <g key={i} className="cs-node" transform={`translate(${p.x} ${p.y})`}>
                <circle className="cs-glow" r="34" />
                <circle className="cs-pulse" r="19" />
                <circle className={i === 0 || i === geo.pts.length - 1 ? "cs-ring cs-ring-end" : "cs-ring"} r="19" />
                <text className="cs-node-n" textAnchor="middle" dy="4">
                  {pad(i + 1)}
                </text>
                <text className="cs-node-label" textAnchor="middle" y={LABEL_DY}>
                  {wrap(nodes[i], maxChars).map((line, li) => (
                    <tspan key={li} x="0" dy={li === 0 ? 0 : LINE_H}>
                      {line}
                    </tspan>
                  ))}
                </text>
              </g>
            ))}

            {Array.from({ length: PACKETS }, (_, k) => (
              <circle key={k} className="cs-packet" r="3.5" opacity="0" />
            ))}
          </svg>
        </div>
      </div>
    </section>
  );
}
