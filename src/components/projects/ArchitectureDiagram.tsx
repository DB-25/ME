"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Architecture, ArchNode, ArchNodeType } from "@/data/projects";
import { prefersReducedMotion } from "@/lib/animations/gsap-config";
import { cn } from "@/lib/utils";

interface ArchitectureDiagramProps {
  architecture: Architecture;
  /** Accent for the title-bar dot / framing. Defaults to terracotta. */
  accent?: string;
  className?: string;
  /**
   * When false, packets do not animate (used by the pinned GENIE timeline,
   * which assembles the diagram itself). Defaults to true.
   */
  animate?: boolean;
}

/** ArchNode.type → color mapping (per design contract). */
const TYPE_COLOR: Record<ArchNodeType, string> = {
  client: "var(--text-secondary)",
  security: "var(--accent)",
  edge: "var(--accent-blue)",
  compute: "var(--text-primary)",
  ai: "var(--accent-teal)",
  data: "var(--accent-purple)",
  storage: "var(--accent-blue)",
};

const TYPE_LABEL: Record<ArchNodeType, string> = {
  client: "client",
  security: "security",
  edge: "edge",
  compute: "compute",
  ai: "ai",
  data: "data",
  storage: "storage",
};

interface Placed {
  node: ArchNode;
  col: number;
  row: number;
  x: number;
  y: number;
}

// --- layout geometry (SVG user units) ---
const NODE_W = 168;
const NODE_H = 56;
const COL_GAP = 92; // horizontal gap between columns
const ROW_GAP = 34; // vertical gap between branched rows
const PAD = 14; // outer padding inside viewBox

/**
 * Assign each node a column (depth from the longest path of incoming edges)
 * and a row (to fan out branches that share a parent). Produces a clean
 * left→right flow with vertical branching, computed purely from the edges.
 */
function layout(architecture: Architecture): {
  placed: Placed[];
  width: number;
  height: number;
} {
  const { nodes, edges } = architecture;

  // Longest-path depth = column index.
  const depth = new Map<string, number>();
  const visiting = new Set<string>();

  function computeDepth(id: string): number {
    if (depth.has(id)) return depth.get(id)!;
    if (visiting.has(id)) return 0; // cycle guard
    visiting.add(id);
    const parents = edges.filter(([, to]) => to === id).map(([from]) => from);
    const d = parents.length === 0 ? 0 : Math.max(...parents.map((p) => computeDepth(p) + 1));
    visiting.delete(id);
    depth.set(id, d);
    return d;
  }
  nodes.forEach((n) => computeDepth(n.id));

  // Group by column, then assign rows within each column.
  const cols = new Map<number, string[]>();
  nodes.forEach((n) => {
    const c = depth.get(n.id) ?? 0;
    if (!cols.has(c)) cols.set(c, []);
    cols.get(c)!.push(n.id);
  });

  const row = new Map<string, number>();
  const colCount = Math.max(...Array.from(cols.keys())) + 1;
  const maxRowsInCol = Math.max(...Array.from(cols.values()).map((c) => c.length));

  for (const [, ids] of cols) {
    // center each column's rows around the vertical midpoint
    const offset = (maxRowsInCol - ids.length) / 2;
    ids.forEach((id, i) => row.set(id, i + offset));
  }

  const placed: Placed[] = nodes.map((n) => {
    const col = depth.get(n.id) ?? 0;
    const r = row.get(n.id) ?? 0;
    return {
      node: n,
      col,
      row: r,
      x: PAD + col * (NODE_W + COL_GAP),
      y: PAD + r * (NODE_H + ROW_GAP),
    };
  });

  const width = PAD * 2 + colCount * NODE_W + (colCount - 1) * COL_GAP;
  const height = PAD * 2 + maxRowsInCol * NODE_H + (maxRowsInCol - 1) * ROW_GAP;

  return { placed, width, height };
}

/** Quadratic-bezier connector from the right edge of `a` to the left edge of `b`. */
function edgePath(a: Placed, b: Placed): string {
  const x1 = a.x + NODE_W;
  const y1 = a.y + NODE_H / 2;
  const x2 = b.x;
  const y2 = b.y + NODE_H / 2;
  const mx = (x1 + x2) / 2;
  // smooth S-curve when rows differ, straight-ish when aligned
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

export function ArchitectureDiagram({
  architecture,
  accent = "var(--accent)",
  className,
  animate = true,
}: ArchitectureDiagramProps) {
  const { placed, width, height } = useMemo(() => layout(architecture), [architecture]);
  const placedById = useMemo(
    () => new Map(placed.map((p) => [p.node.id, p])),
    [placed]
  );

  const [reduced, setReduced] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);
  const packetRefs = useRef<(SVGCircleElement | null)[]>([]);
  const pathRefs = useRef<(SVGPathElement | null)[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  const validEdges = useMemo(
    () =>
      architecture.edges.filter(
        ([from, to]) => placedById.has(from) && placedById.has(to)
      ),
    [architecture.edges, placedById]
  );

  // Animate data packets traveling along each edge on a staggered loop.
  useEffect(() => {
    if (reduced || !animate) return;
    if (typeof window === "undefined") return;

    const paths = pathRefs.current;
    const lengths = paths.map((p) => (p ? p.getTotalLength() : 0));
    const DUR = 2200; // ms per traversal
    const start = performance.now();

    function frame(now: number) {
      for (let i = 0; i < paths.length; i++) {
        const path = paths[i];
        const packet = packetRefs.current[i];
        if (!path || !packet) continue;
        const len = lengths[i];
        // stagger each packet so they don't all fire in lockstep
        const phase = (i * 0.18) % 1;
        const t = (((now - start) / DUR + phase) % 1 + 1) % 1;
        const pt = path.getPointAtLength(t * len);
        packet.setAttribute("cx", String(pt.x));
        packet.setAttribute("cy", String(pt.y));
        // fade in/out at the ends for a softer pulse
        const fade =
          t < 0.12 ? t / 0.12 : t > 0.88 ? (1 - t) / 0.12 : 1;
        packet.setAttribute("opacity", String(0.85 * fade));
      }
      rafRef.current = requestAnimationFrame(frame);
    }
    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    };
  }, [reduced, animate, validEdges.length]);

  return (
    <figure
      className={cn("not-prose w-full", className)}
      aria-label="System architecture diagram"
    >
      <div className="tile overflow-hidden">
        {/* title bar — editorial, mono */}
        <div className="flex items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className="inline-block h-[7px] w-[7px] rounded-full"
              style={{ background: accent }}
            />
            <span className="label-mono">system architecture</span>
          </div>
          <span className="label-mono hidden sm:inline">
            {placed.length} services
          </span>
        </div>

        <div className="px-3 py-5 sm:px-5">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            width="100%"
            role="img"
            preserveAspectRatio="xMidYMid meet"
            style={{ maxWidth: "100%", display: "block" }}
            className="h-auto"
          >
            {/* edges */}
            <g fill="none">
              {validEdges.map(([from, to], i) => {
                const a = placedById.get(from)!;
                const b = placedById.get(to)!;
                const d = edgePath(a, b);
                const active =
                  hovered === from || hovered === to || hovered === null;
                return (
                  <path
                    key={`edge-${from}-${to}`}
                    ref={(el) => {
                      pathRefs.current[i] = el;
                    }}
                    d={d}
                    stroke="var(--hairline-strong)"
                    strokeWidth={1.25}
                    opacity={active ? 1 : 0.25}
                    style={{ transition: "opacity 0.3s var(--ease-hover)" }}
                  />
                );
              })}
            </g>

            {/* traveling data packets */}
            <g>
              {validEdges.map(([from, to], i) => (
                <circle
                  key={`packet-${from}-${to}`}
                  ref={(el) => {
                    packetRefs.current[i] = el;
                  }}
                  r={2.75}
                  cx={placedById.get(from)!.x + NODE_W}
                  cy={placedById.get(from)!.y + NODE_H / 2}
                  fill={accent}
                  opacity={reduced || !animate ? 0 : 0.85}
                />
              ))}
            </g>

            {/* nodes */}
            <g>
              {placed.map((p) => {
                const color = TYPE_COLOR[p.node.type];
                const dim = hovered !== null && hovered !== p.node.id;
                return (
                  <g
                    key={p.node.id}
                    transform={`translate(${p.x}, ${p.y})`}
                    onMouseEnter={() => setHovered(p.node.id)}
                    onMouseLeave={() => setHovered(null)}
                    style={{
                      cursor: "default",
                      transition: "opacity 0.3s var(--ease-hover)",
                      opacity: dim ? 0.45 : 1,
                    }}
                  >
                    <rect
                      width={NODE_W}
                      height={NODE_H}
                      rx={10}
                      fill="var(--bg-elevated)"
                      stroke={
                        hovered === p.node.id ? color : "var(--hairline-strong)"
                      }
                      strokeWidth={hovered === p.node.id ? 1.5 : 1}
                      style={{ transition: "stroke 0.25s var(--ease-hover)" }}
                    />
                    {/* type dot */}
                    <circle cx={16} cy={NODE_H / 2} r={4} fill={color} />
                    {/* label */}
                    <text
                      x={30}
                      y={NODE_H / 2 - 4}
                      fill="var(--text-primary)"
                      style={{
                        font: "500 12px var(--font-sans)",
                        letterSpacing: "-0.01em",
                      }}
                    >
                      {p.node.label}
                    </text>
                    <text
                      x={30}
                      y={NODE_H / 2 + 12}
                      fill="var(--text-tertiary)"
                      style={{
                        font: "400 9px var(--font-mono)",
                        letterSpacing: "0.14em",
                        textTransform: "uppercase",
                      }}
                    >
                      {TYPE_LABEL[p.node.type]}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>
    </figure>
  );
}
