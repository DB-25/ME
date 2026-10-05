"use client";

import { useMemo } from "react";
import { isLand } from "@/components/signal/formations/landmask";
import { glowWeight } from "@/components/signal/visitsGlow";
import type { VisitCell, YouCell } from "./visitsClient";

/**
 * The visitors map as a light 2D SVG: phones, and desktops where the live field is not running. The world is the
 * globe's own land mask (no extra asset) sampled on a coarse grid into one path of round dots; each cell is a
 * glow scaled by log(count), and the viewer's own cell gets the "you are here" ring. Equirectangular, one unit per degree.
 */
const LON_SPAN = 360;
const LAT_TOP = 80;
const LAT_BOTTOM = -58;
const DOT_STEP_DEG = 3;
const DOT_SIZE = 1.5;
const GLOW_BASE = 3;
const GLOW_GROW = 7;
const CORE_BASE = 0.9;
const CORE_GROW = 1.6;

const x = (lon: number) => lon + LON_SPAN / 2;
const y = (lat: number) => LAT_TOP - lat;

/** "M x y h0" per land sample: with a round cap each becomes a dot, and the whole world is one path. */
function worldDots(): string {
  const parts: string[] = [];
  for (let lat = LAT_TOP - DOT_STEP_DEG / 2; lat > LAT_BOTTOM; lat -= DOT_STEP_DEG) {
    for (let lon = -180 + DOT_STEP_DEG / 2; lon < 180; lon += DOT_STEP_DEG) {
      if (isLand(lon, lat)) parts.push(`M${x(lon)} ${y(lat)}h0`);
    }
  }
  return parts.join("");
}

type Props = { cells: VisitCell[]; you: YouCell | null; motion: boolean };

export default function VisitsMap({ cells, you, motion }: Props) {
  const dots = useMemo(() => worldDots(), []);
  const max = cells.reduce((m, c) => Math.max(m, c[2]), 0);
  const ordered = useMemo(() => [...cells].sort((a, b) => a[2] - b[2]), [cells]);

  return (
    <svg className="vm" viewBox={`0 0 ${LON_SPAN} ${LAT_TOP - LAT_BOTTOM}`} role="img" aria-label="World map of visitor locations, brighter spots are busier">
      <defs>
        <radialGradient id="vm-glow">
          <stop offset="0" stopColor="#ffd9a8" stopOpacity="0.95" />
          <stop offset="0.35" stopColor="#ffa94d" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffa94d" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d={dots} className="vm-land" strokeWidth={DOT_SIZE} strokeLinecap="round" />
      {ordered.map(([lat, lon, count], i) => {
        const w = glowWeight(count, max);
        return (
          <g key={`${lat}:${lon}`} transform={`translate(${x(lon)} ${y(lat)})`}>
            <circle className={motion ? "vm-pulse" : undefined} style={motion ? { animationDelay: `${(i * 0.37) % 2.4}s` } : undefined} r={GLOW_BASE + GLOW_GROW * w} fill="url(#vm-glow)" />
            <circle r={CORE_BASE + CORE_GROW * w} fill="#ffe3bd" />
          </g>
        );
      })}
      {you && (
        <g transform={`translate(${x(you.lon)} ${y(you.lat)})`}>
          <circle className={motion ? "vm-ring" : undefined} r={motion ? 3 : 7} fill="none" stroke="#fff" strokeWidth={0.7} opacity={motion ? 1 : 0.8} />
          <circle r={1.6} fill="#fff" />
        </g>
      )}
    </svg>
  );
}
