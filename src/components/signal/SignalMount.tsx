"use client";

import dynamic from "next/dynamic";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { assetUrl } from "@/lib/asset";
import { prefersReducedMotion, isCoarsePointer } from "@/lib/motion";
import { devFlag, installDevHooks } from "./devtools";
import type { FieldQuality } from "./fieldTypes";
import { afterPaint, onIdle } from "./schedule";
import { useChapterScroll } from "./useChapterScroll";

const SignalCanvas = dynamic(() => import("./SignalCanvas"), { ssr: false });
const FpsOverlay = process.env.NODE_ENV !== "production" ? dynamic(() => import("./FpsOverlay").then((m) => m.FpsOverlay), { ssr: false }) : null;

const COUNT_DESKTOP = 96_000;
const COUNT_MOBILE = 12_000;
const LOW_CORES = 4;
const DPR_MAX = 1.5;
const DPR_MAX_LOW = 1.25;
const SIZE_BOOST_LOW = 1.55;
const SMALL_VIEWPORT = 768;
/** Phones that never touch the page still get the field, but well after any load measurement window. */
const IDLE_PHONE_FALLBACK_MS = 8000;
const FADE_IN = "opacity 0.9s cubic-bezier(0.16, 1, 0.3, 1)";
const INTERACTION_EVENTS = ["scroll", "wheel", "touchstart", "pointerdown", "keydown"] as const;

function pickQuality(): FieldQuality {
  const coarse = isCoarsePointer();
  const lowEnd = (navigator.hardwareConcurrency ?? 8) <= LOW_CORES;
  const small = window.innerWidth < SMALL_VIEWPORT;
  const light = coarse || lowEnd || small;
  // Phones skip postprocessing (its own chunk, plus a full-screen HDR pass); dev flags force either path for comparison.
  const lean = devFlag("lean") || (!devFlag("fx") && (coarse || small));
  return {
    count: light ? COUNT_MOBILE : COUNT_DESKTOP,
    sizeBoost: light ? SIZE_BOOST_LOW : 1,
    reducedMotion: prefersReducedMotion(),
    coarse,
    maxDpr: light ? DPR_MAX_LOW : DPR_MAX,
    lean,
  };
}

/** Cheap capability check: no context is created here (that costs a long task); R3F's own failure lands in GlBoundary. */
function hasWebGL2Api(): boolean {
  return typeof WebGL2RenderingContext !== "undefined";
}

/** Phones and coarse pointers wait for the first interaction (or a long fallback), so three.js never competes with load. */
function afterInteraction(cb: () => void): () => void {
  const timer = window.setTimeout(go, IDLE_PHONE_FALLBACK_MS);
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

/** Desktop: first paint -> boot. Phones: load -> first paint -> first input -> idle -> boot. Returns a cancel function. */
function scheduleBoot(deferToInput: boolean, boot: () => void): () => void {
  let cancelStage: () => void = () => {};
  const idleStage = () => {
    cancelStage = onIdle(boot);
  };
  const gateStage = () => {
    // Desktop (fine pointer) mounts straight after first paint; phones wait for the first input.
    if (deferToInput) cancelStage = afterInteraction(idleStage);
    else boot();
  };
  const paintStage = () => {
    cancelStage = afterPaint(gateStage);
  };
  let loadListener = false;
  if (!deferToInput || document.readyState === "complete") paintStage();
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

const PHONE_POSTER = "/signal-hero-phone.webp";
/** The poster only stands in for the hero formation: a deep link further down the page keeps the plain glow. */
const POSTER_MAX_SCROLL = 0.5;

/**
 * A still of the hero waveform for phones, shown until the live field boots on first touch. It is drawn into a
 * 2D canvas after load (canvas never counts as an LCP candidate) and crossfades out once GL is on screen.
 */
function PhonePoster({ gone }: { gone: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);

  useEffect(() => {
    const canvas = ref.current;
    const isPhone = isCoarsePointer() || window.innerWidth < SMALL_VIEWPORT;
    if (!canvas || !isPhone || !hasWebGL2Api() || window.scrollY > window.innerHeight * POSTER_MAX_SCROLL) return;
    let cancelled = false;
    const draw = () => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        // Cover fit, like background-size: cover.
        const scale = Math.max(canvas.width / img.naturalWidth, canvas.height / img.naturalHeight);
        const dw = img.naturalWidth * scale;
        const dh = img.naturalHeight * scale;
        ctx.drawImage(img, (canvas.width - dw) / 2, (canvas.height - dh) / 2, dw, dh);
        setDrawn(true);
      };
      img.src = assetUrl(PHONE_POSTER);
    };
    if (document.readyState === "complete") draw();
    else window.addEventListener("load", draw, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", draw);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: drawn && !gone ? 1 : 0, transition: FADE_IN }}
    />
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
      <PhonePoster gone={visible && !lost} />
      {glOk && quality && (
        <div style={{ position: "absolute", inset: 0, opacity: visible && !lost ? 1 : 0, transition: FADE_IN }}>
          <GlBoundary onError={() => setGlOk(false)}>
            <SignalCanvas
              quality={quality}
              onReady={() => setVisible(true)}
              onContextLost={() => setLost(true)}
              onContextRestored={() => setLost(false)}
              onError={(error) => {
                console.error("[signal] WebGL field failed, using fallback", error);
                setGlOk(false);
              }}
            />
          </GlBoundary>
        </div>
      )}
      {FpsOverlay && <FpsOverlay />}
    </div>
  );
}
