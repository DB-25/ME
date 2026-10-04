"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { Component, useEffect, useRef, useState, type ReactNode } from "react";
import { assetUrl } from "@/lib/asset";
import { prefersReducedMotion, isCoarsePointer } from "@/lib/motion";
import { FieldUnavailableError, fieldOverride, probeGpu, shouldGuardGpu } from "./capability";
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
const DESKTOP_POSTER = "/signal-hero-desktop.webp";
/** The poster only stands in for the hero formation: a deep link further down the page keeps the plain glow. */
const POSTER_MAX_SCROLL = 0.5;
/** Past this much of a viewport the hero is leaving, so the still fades and the chapters below read on the plain glow. */
const POSTER_FADE_AT = 0.6;

/**
 * A still of the hero waveform. Phones show it until the live field boots on first touch. Desktops show it only
 * when the live field cannot run (software GL, a GPU too slow to hold it, no WebGL), so those visitors get the
 * same picture instead of an empty glow. It is drawn into a 2D canvas after load (canvas never counts as an LCP
 * candidate), scaled with object-fit: cover, and crossfades out once GL is on screen or the hero scrolls away.
 */
function Poster({ wanted, gone, isHome }: { wanted: boolean; gone: boolean; isHome: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState(false);
  const [pastHero, setPastHero] = useState(false);

  useEffect(() => {
    if (!drawn) return;
    const onScroll = () => setPastHero(window.scrollY > window.innerHeight * POSTER_FADE_AT);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [drawn]);

  useEffect(() => {
    const canvas = ref.current;
    // The still is the home hero's formation: other routes (case studies, the 404) keep the plain glow.
    if (!canvas || !isHome || !(wanted || isPhoneViewport()) || window.scrollY > window.innerHeight * POSTER_MAX_SCROLL) return;
    let cancelled = false;
    const draw = () => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        if (cancelled) return;
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        setDrawn(true);
      };
      img.src = assetUrl(isPhoneViewport() ? PHONE_POSTER : DESKTOP_POSTER);
    };
    if (document.readyState === "complete") draw();
    else window.addEventListener("load", draw, { once: true });
    return () => {
      cancelled = true;
      window.removeEventListener("load", draw);
    };
  }, [wanted, isHome]);

  return (
    <canvas
      ref={ref}
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: drawn && isHome && !gone && !pastHero ? 1 : 0, transition: FADE_IN }}
    />
  );
}

/** No WebGL2, or the poster was asked for: no engine to start. Read lazily so the server render is unaffected. */
function noFieldUpFront(): boolean {
  return typeof window !== "undefined" && (!hasWebGL2Api() || fieldOverride() === "poster");
}

function isPhoneViewport(): boolean {
  return isCoarsePointer() || window.innerWidth < SMALL_VIEWPORT;
}

export function SignalMount() {
  useChapterScroll();
  const isHome = usePathname() === "/";
  const [quality, setQuality] = useState<FieldQuality | null>(null);
  const [glOk, setGlOk] = useState(false);
  const [visible, setVisible] = useState(false);
  const [lost, setLost] = useState(false);
  /** Phones always get the poster before the field; desktops only once the field has been ruled out. */
  const [unavailable, setUnavailable] = useState(noFieldUpFront);

  useEffect(() => {
    const q = pickQuality();
    if (process.env.NODE_ENV !== "production") {
      installDevHooks(q.count);
    }
    if (noFieldUpFront()) return;
    const deferToInput = q.coarse || window.innerWidth < SMALL_VIEWPORT;
    return scheduleBoot(deferToInput, () => {
      // Runs alongside the three.js chunk download; the engine awaits the same promise.
      if (shouldGuardGpu()) void probeGpu();
      setQuality(q);
      setGlOk(true);
    });
  }, []);

  return (
    <div aria-hidden="true" style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", background: "#060509" }}>
      <Fallback />
      <Poster wanted={unavailable} gone={visible && !lost} isHome={isHome} />
      {glOk && quality && (
        <div style={{ position: "absolute", inset: 0, opacity: visible && !lost ? 1 : 0, transition: FADE_IN }}>
          <GlBoundary onError={() => { setUnavailable(true); setGlOk(false); }}>
            <SignalCanvas
              quality={quality}
              onReady={() => setVisible(true)}
              onContextLost={() => setLost(true)}
              onContextRestored={() => setLost(false)}
              onError={(error) => {
                // A machine that cannot run the field is expected, not a bug: no console error for it.
                if (error instanceof FieldUnavailableError) console.info(`[signal] ${error.message}, showing the poster`);
                else console.error("[signal] WebGL field failed, using fallback", error);
                setVisible(false);
                setUnavailable(true);
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
