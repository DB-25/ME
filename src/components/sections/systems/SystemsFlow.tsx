"use client";

import { useEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { Scrim } from "../Scrim";
import { STAGES } from "./stages";
import "./systems.css";

const N = STAGES.length;
const ROW = 124;
const W = 120;
const X_A = 36;
const X_B = 84;
// Coarse pass then a local refine: ~60 path lookups per node instead of 600.
const COARSE = 40;
const FINE = 20;
const PACKETS = 3;
const SWING = 0.58;

const nodes = STAGES.map((_, i) => ({ x: i % 2 === 0 ? X_A : X_B, y: ROW * i + ROW / 2 }));
const PATH = nodes.reduce((d, p, i) => {
  if (i === 0) return `M ${p.x} ${p.y}`;
  const a = nodes[i - 1];
  return `${d} C ${a.x} ${a.y + ROW * SWING}, ${p.x} ${p.y - ROW * SWING}, ${p.x} ${p.y}`;
}, "");

/**
 * One flowing line through five stages. Scroll draws it, stages light as it arrives, packets ride the part
 * that is drawn. The labels are plain rows in a separate column, so the diagram reads without motion too.
 */
export function SystemsFlow() {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);

  useEffect(() => {
    const wrapEl = wrap.current;
    const svgEl = svg.current;
    if (!wrapEl || !svgEl) return;
    const track = svgEl.querySelector<SVGPathElement>(".sys-track");
    const maskPath = svgEl.querySelector<SVGPathElement>(".sys-mask-path");
    const nodeEls = [...svgEl.querySelectorAll<SVGGElement>(".sys-node")];
    const pulses = [...svgEl.querySelectorAll<SVGCircleElement>(".sys-pulse")];
    const packets = [...svgEl.querySelectorAll<SVGCircleElement>(".sys-packet")];
    const rows = [...wrapEl.querySelectorAll<HTMLElement>(".sys-row")];
    if (!track || !maskPath) return;

    const light = (i: number, on: boolean) => {
      for (const el of [nodeEls[i], rows[i]]) {
        if (on) el.setAttribute("data-lit", "");
        else el.removeAttribute("data-lit");
      }
    };

    if (prefersReducedMotion()) {
      gsap.set(maskPath, { strokeDashoffset: 0 });
      nodeEls.forEach((_, i) => light(i, true));
      return;
    }

    // Where along the path (0..1) each node sits, found by sampling.
    const total = track.getTotalLength();
    const nearest = (p: { x: number; y: number }, from: number, to: number, steps: number) => {
      let best = from;
      let bestD = Infinity;
      for (let s = 0; s <= steps; s++) {
        const f = from + ((to - from) * s) / steps;
        const q = track.getPointAtLength(f * total);
        const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2;
        if (d < bestD) {
          bestD = d;
          best = f;
        }
      }
      return best;
    };
    const at = nodes.map((p) => {
      const coarse = nearest(p, 0, 1, COARSE);
      const step = 1 / COARSE;
      return nearest(p, Math.max(0, coarse - step), Math.min(1, coarse + step), FINE);
    });

    let drawn = 0;
    const lit = new Array<boolean>(N).fill(false);
    nodeEls.forEach((_, i) => light(i, false));
    const ctx = gsap.context(() => {
      gsap.set(pulses, { transformOrigin: "50% 50%" });
      gsap.fromTo(
        maskPath,
        { strokeDashoffset: 1 },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: {
            trigger: wrapEl,
            start: "top 68%",
            end: "bottom 52%",
            scrub: 0.6,
            onUpdate: (self) => {
              drawn = self.progress;
              at.forEach((t, i) => {
                const on = drawn >= Math.min(t, 0.985) - 0.001;
                if (on === lit[i]) return;
                lit[i] = on;
                light(i, on);
                if (on) gsap.fromTo(pulses[i], { opacity: 0.9, scale: 1 }, { opacity: 0, scale: 2.4, duration: 0.8, ease: "expo.out" });
              });
            },
          },
        },
      );
    }, wrapEl);

    const state = { t: 0 };
    const tick = (_: number, dt: number) => {
      state.t += dt / 1000;
      packets.forEach((p, k) => {
        if (drawn < 0.03) {
          p.setAttribute("opacity", "0");
          return;
        }
        const f = (state.t * 0.14 + k / PACKETS) % 1;
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
  }, []);

  return (
    <div ref={wrap} className="sys-flow relative">
      <Scrim shape="left" strength={0.7} inset="-6% -4% -6% -24px" />
      <svg
        ref={svg}
        className="sys-svg"
        viewBox={`0 0 ${W} ${ROW * N}`}
        role="img"
        aria-label={`The pipeline in five stages: ${STAGES.map((s) => s.label).join(", then ")}.`}
      >
        <defs>
          <mask id="sys-mask" maskUnits="userSpaceOnUse" x="0" y="0" width={W} height={ROW * N}>
            <path className="sys-mask-path" d={PATH} fill="none" stroke="#fff" strokeWidth="12" pathLength={1} strokeDasharray="1" strokeDashoffset="0" />
          </mask>
        </defs>
        <path className="sys-track" d={PATH} />
        <g mask="url(#sys-mask)">
          <path className="sys-line" d={PATH} />
          <path className="sys-flowdash" d={PATH} />
        </g>
        {nodes.map((p, i) => (
          <g key={STAGES[i].id} className="sys-node" transform={`translate(${p.x} ${p.y})`}>
            <circle className="sys-glow" r="30" />
            <circle className="sys-pulse" r="15" />
            <circle className="sys-ring" r="15" />
            <text className="sys-n" textAnchor="middle" dy="3.5">
              {String(i + 1).padStart(2, "0")}
            </text>
          </g>
        ))}
        {Array.from({ length: PACKETS }, (_, k) => (
          <circle key={k} className="sys-packet" r="3" opacity="0" />
        ))}
      </svg>

      <ol className="sys-rows">
        {STAGES.map((s) => (
          <li key={s.id} className="sys-row" data-lit="">
            <h3 className="text-[clamp(1.375rem,2.2vw,1.875rem)] font-medium leading-none tracking-[-0.035em] text-ink">{s.label}</h3>
            <p className="label mt-2">{s.component}</p>
            <p className="mt-2 max-w-[28rem] text-[0.875rem] leading-[1.45] text-ink/75 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">{s.line}</p>
          </li>
        ))}
      </ol>
    </div>
  );
}
