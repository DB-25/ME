"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { prefersReducedMotion, isCoarsePointer } from "@/lib/motion";
import { signalStore } from "@/lib/signal-store";
import { FpsOverlay } from "./FpsOverlay";
import type { FieldQuality } from "./SignalField";
import { useChapterScroll } from "./useChapterScroll";

const SignalCanvas = dynamic(() => import("./SignalCanvas"), { ssr: false });

const COUNT_DESKTOP = 96_000;
const COUNT_MOBILE = 18_000;
const LOW_CORES = 4;

function hasWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function pickQuality(): FieldQuality {
  const coarse = isCoarsePointer();
  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= LOW_CORES;
  const small = window.innerWidth < 768;
  const light = coarse || lowEnd || small;
  return {
    count: light ? COUNT_MOBILE : COUNT_DESKTOP,
    sizeBoost: light ? 1.55 : 1,
    reducedMotion: prefersReducedMotion(),
    coarse,
  };
}

/** Falls back to the CSS glow if the GL tree throws (context loss, shader failure). */
class GlBoundary extends Component<{ onError: () => void; children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: unknown) {
    console.error("[signal] WebGL field failed, using fallback", error);
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const GRAIN =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.55 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>\")";

/** Static atmosphere: used before GL arrives and whenever WebGL is unavailable. */
function Fallback() {
  return (
    <>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(60% 55% at 50% 42%, rgba(139,123,255,0.22), rgba(139,123,255,0.06) 55%, transparent 75%), radial-gradient(40% 40% at 78% 70%, rgba(201,190,255,0.07), transparent 70%), #060509",
        }}
      />
      <div style={{ position: "absolute", inset: 0, opacity: 0.07, backgroundImage: GRAIN, mixBlendMode: "screen" }} />
    </>
  );
}

declare global {
  interface Window {
    __signal?: typeof signalStore;
    __signalTools?: { sampleSvg: typeof import("./fromSvg").sampleSvg; count: number };
  }
}

export function SignalMount() {
  useChapterScroll();
  const [quality, setQuality] = useState<FieldQuality | null>(null);
  const [glOk, setGlOk] = useState(false);
  const [visible, setVisible] = useState(false);
  const [showFps, setShowFps] = useState(false);

  useEffect(() => {
    setShowFps(new URLSearchParams(window.location.search).has("fps"));
    const q = pickQuality();
    const webgl = hasWebGL2();

    if (process.env.NODE_ENV !== "production") {
      window.__signal = signalStore;
      import("./fromSvg").then((m) => {
        window.__signalTools = { sampleSvg: m.sampleSvg, count: q.count };
      });
    }

    // Give first paint and the preloader priority: mount GL on idle.
    const w = window as unknown as { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };
    const start = () => {
      setQuality(q);
      setGlOk(webgl);
    };
    let idleId = 0;
    let timeoutId = 0;
    const kick = () => {
      if (w.requestIdleCallback) idleId = w.requestIdleCallback(start, { timeout: 1200 });
      else timeoutId = window.setTimeout(start, 150);
    };
    if (document.readyState === "complete") kick();
    else window.addEventListener("load", kick, { once: true });

    return () => {
      window.removeEventListener("load", kick);
      if (idleId && w.cancelIdleCallback) w.cancelIdleCallback(idleId);
      window.clearTimeout(timeoutId);
    };
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "#060509" }}>
      <Fallback />
      {glOk && quality && (
        <div style={{ position: "absolute", inset: 0, opacity: visible ? 1 : 0, transition: "opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1)" }}>
          <GlBoundary onError={() => setGlOk(false)}>
            <SignalCanvas quality={quality} onReady={() => setVisible(true)} />
          </GlBoundary>
        </div>
      )}
      {showFps && <FpsOverlay />}
    </div>
  );
}
