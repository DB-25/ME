"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useState, type ReactNode } from "react";
import { prefersReducedMotion, isCoarsePointer } from "@/lib/motion";
import { installDevHooks } from "./devtools";
import type { FieldQuality } from "./SignalField";
import { useChapterScroll } from "./useChapterScroll";

const SignalCanvas = dynamic(() => import("./SignalCanvas"), { ssr: false });
const FpsOverlay = process.env.NODE_ENV !== "production" ? dynamic(() => import("./FpsOverlay").then((m) => m.FpsOverlay), { ssr: false }) : null;

const COUNT_DESKTOP = 96_000;
const COUNT_MOBILE = 18_000;
const LOW_CORES = 4;
const DPR_MAX = 1.5;
const DPR_MAX_LOW = 1.25;
const SIZE_BOOST_LOW = 1.55;
const SMALL_VIEWPORT = 768;
const IDLE_TIMEOUT_MS = 1200;
const LIGHT_DELAY_MS = 2500;
const FALLBACK_DELAY_MS = 150;
const FADE_IN = "opacity 1.4s cubic-bezier(0.16, 1, 0.3, 1)";
const INTERACTION_EVENTS = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;

function pickQuality(): FieldQuality {
  const coarse = isCoarsePointer();
  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= LOW_CORES;
  const small = window.innerWidth < SMALL_VIEWPORT;
  const light = coarse || lowEnd || small;
  return {
    count: light ? COUNT_MOBILE : COUNT_DESKTOP,
    sizeBoost: light ? SIZE_BOOST_LOW : 1,
    reducedMotion: prefersReducedMotion(),
    coarse,
    maxDpr: light ? DPR_MAX_LOW : DPR_MAX,
  };
}

/** Cheap capability check: no context is created here (that costs a long task); R3F's own failure lands in GlBoundary. */
function hasWebGL2Api(): boolean {
  return typeof WebGL2RenderingContext !== "undefined";
}

type IdleWindow = Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number; cancelIdleCallback?: (n: number) => void };

function onIdle(cb: () => void): () => void {
  const w = window as IdleWindow;
  if (w.requestIdleCallback && w.cancelIdleCallback) {
    const id = w.requestIdleCallback(cb, { timeout: IDLE_TIMEOUT_MS });
    return () => w.cancelIdleCallback?.(id);
  }
  const id = window.setTimeout(cb, FALLBACK_DELAY_MS);
  return () => window.clearTimeout(id);
}

/** After the first frame has been presented, so GL never competes with first paint. */
function afterPaint(cb: () => void): () => void {
  let timer = 0;
  const raf = requestAnimationFrame(() => {
    timer = window.setTimeout(cb, 0);
  });
  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(timer);
  };
}

/** Phones and coarse pointers wait for the first interaction or a short delay, whichever comes first. */
function afterInteractionOrDelay(cb: () => void): () => void {
  const timer = window.setTimeout(go, LIGHT_DELAY_MS);
  function stop() {
    window.clearTimeout(timer);
    INTERACTION_EVENTS.forEach((e) => window.removeEventListener(e, go));
  }
  function go() {
    stop();
    cb();
  }
  INTERACTION_EVENTS.forEach((e) => window.addEventListener(e, go, { passive: true, once: true }));
  return stop;
}

/** load -> first paint -> (phones: first scroll or 2.5s) -> idle -> boot. Returns a cancel function. */
function scheduleBoot(deferToInput: boolean, boot: () => void): () => void {
  let cancelStage: () => void = () => {};
  const idleStage = () => {
    cancelStage = onIdle(boot);
  };
  const gateStage = () => {
    cancelStage = deferToInput ? afterInteractionOrDelay(idleStage) : onIdle(boot);
  };
  const paintStage = () => {
    cancelStage = afterPaint(gateStage);
  };
  let loadListener = false;
  if (document.readyState === "complete") paintStage();
  else {
    loadListener = true;
    window.addEventListener("load", paintStage, { once: true });
  }
  return () => {
    if (loadListener) window.removeEventListener("load", paintStage);
    cancelStage();
  };
}

/** Falls back to the CSS glow if the GL tree throws (context creation, shader failure). */
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

/** Static atmosphere: used before GL arrives and whenever WebGL is unavailable or its context is lost. */
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

export function SignalMount() {
  useChapterScroll();
  const [quality, setQuality] = useState<FieldQuality | null>(null);
  const [glOk, setGlOk] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lost, setLost] = useState(false);

  useEffect(() => {
    const q = pickQuality();
    if (process.env.NODE_ENV !== "production") {
      installDevHooks(q.count);
    }
    if (!hasWebGL2Api()) return;
    const deferToInput = q.coarse || window.innerWidth < SMALL_VIEWPORT;
    return scheduleBoot(deferToInput, () => {
      setQuality(q);
      setGlOk(true);
    });
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "#060509" }}>
      <Fallback />
      {glOk && quality && (
        <div style={{ position: "absolute", inset: 0, opacity: visible && !lost ? 1 : 0, transition: FADE_IN }}>
          <GlBoundary onError={() => setGlOk(false)}>
            <SignalCanvas quality={quality} onReady={() => setVisible(true)} onContextLost={() => setLost(true)} onContextRestored={() => setLost(false)} />
          </GlBoundary>
        </div>
      )}
      {FpsOverlay && <FpsOverlay />}
    </div>
  );
}
