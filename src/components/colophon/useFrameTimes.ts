import { useEffect, useRef, useState, type RefObject } from "react";

const SAMPLES = 120;
/** The chart's vertical range: 60 fps sits a third of the way up, 30 fps two thirds. */
export const CHART_MAX_MS = 50;
/** Longer gaps mean the tab was in the background, not that a frame was slow. */
const MAX_PLAUSIBLE_MS = 1000;
const READOUT_MS = 500;
const SLOW_MS = 33.4;

export type FrameStats = { avg: number; worst: number; fps: number } | null;

/**
 * Times the page's own animation frames and draws them as bars into a canvas. It runs only while `active`: the
 * requestAnimationFrame loop is cancelled the moment the panel closes, so there is no cost when it is shut.
 */
export function useFrameTimes(active: boolean, canvas: RefObject<HTMLCanvasElement | null>): FrameStats {
  const [stats, setStats] = useState<FrameStats>(null);
  const ring = useRef(new Float32Array(SAMPLES));

  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext("2d");
    if (!active || !el || !ctx) return;
    const times = ring.current;
    times.fill(0);
    let filled = 0;
    let head = 0;
    let last = 0;
    let raf = 0;
    let lastReadout = 0;
    const style = getComputedStyle(el);
    const calm = style.getPropertyValue("--color-accent").trim() || "#8b7bff";
    const slow = style.getPropertyValue("--color-saffron").trim() || "#ffa94d";

    const draw = () => {
      const dpr = window.devicePixelRatio || 1;
      const w = Math.max(1, Math.round(el.clientWidth * dpr));
      const h = Math.max(1, Math.round(el.clientHeight * dpr));
      if (el.width !== w || el.height !== h) {
        el.width = w;
        el.height = h;
      }
      ctx.clearRect(0, 0, w, h);
      const slot = w / SAMPLES;
      const bar = Math.max(1, Math.floor(slot) - Math.max(1, Math.round(dpr / 2)));
      for (let i = 0; i < filled; i++) {
        const ms = times[(head - filled + i + SAMPLES) % SAMPLES];
        ctx.fillStyle = ms > SLOW_MS ? slow : calm;
        const barH = Math.max(1, Math.min(1, ms / CHART_MAX_MS) * h);
        ctx.fillRect((SAMPLES - filled + i) * slot, h - barH, bar, barH);
      }
    };

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const delta = last ? now - last : 0;
      last = now;
      if (delta <= 0 || delta > MAX_PLAUSIBLE_MS) return;
      times[head] = delta;
      head = (head + 1) % SAMPLES;
      filled = Math.min(SAMPLES, filled + 1);
      draw();
      if (now - lastReadout < READOUT_MS) return;
      lastReadout = now;
      let sum = 0;
      let worst = 0;
      for (let i = 0; i < filled; i++) {
        const ms = times[(head - filled + i + SAMPLES) % SAMPLES];
        sum += ms;
        worst = Math.max(worst, ms);
      }
      const avg = sum / filled;
      setStats({ avg, worst, fps: 1000 / avg });
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, canvas]);

  return stats;
}
