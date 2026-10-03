/**
 * Development-only hooks (?fps overlay, ?noadapt, ?introhold, window.__signal, window.__signalFps).
 * Every entry point is gated on NODE_ENV so production bundles carry none of it.
 */
import { signalStore } from "@/lib/signal-store";
import { fieldMotion } from "./readingMode";

declare global {
  interface Window {
    __signal?: typeof signalStore;
    __signalFps?: number;
    __signalMotion?: typeof fieldMotion;
    __signalTools?: { sampleSvg: typeof import("./fromSvg").sampleSvg; count: number };
  }
}

const FPS_WINDOW_MS = 500;

/** True in dev when the URL carries `?name`. Always false in production. */
export function devFlag(name: string): boolean {
  if (process.env.NODE_ENV === "production") return false;
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).has(name);
}

/** Exposes the store and the SVG sampler for scripts/shoot.mjs. */
export function installDevHooks(count: number) {
  if (process.env.NODE_ENV === "production") return;
  window.__signal = signalStore;
  window.__signalMotion = fieldMotion;
  import("./fromSvg").then((m) => {
    window.__signalTools = { sampleSvg: m.sampleSvg, count };
  });
}

let probeFrames = 0;
let probeLast = 0;

/** Called once per rendered frame; publishes the rate the ?fps overlay polls. */
export function recordFrame() {
  if (process.env.NODE_ENV === "production") return;
  const now = performance.now();
  if (!probeLast) probeLast = now;
  probeFrames++;
  if (now - probeLast >= FPS_WINDOW_MS) {
    window.__signalFps = Math.round((probeFrames * 1000) / (now - probeLast));
    probeFrames = 0;
    probeLast = now;
  }
}
