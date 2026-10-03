"use client";

import { useEffect, useRef, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { signalStore } from "@/lib/signal-store";
import { lockScroll } from "./scroll-lock";

const SEEN_KEY = "db:preloader-seen";
const MIN_MS = 1600;
const MIN_MS_REDUCED = 700;
/** Hard cap: force completion here so the exit finishes inside 4.5s. */
const FORCE_MS = 3900;
const HARD_CAP_MS = 4500;

const PHASES = ["RESOLVING NOISE", "LOCKING FREQUENCY", "SIGNAL ACQUIRED"];

function alreadySeen(): boolean {
  try {
    return sessionStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return false;
  }
}
function markSeen() {
  try {
    sessionStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* private mode: just replay next time */
  }
}

const pad3 = (n: number) => String(Math.round(n)).padStart(3, "0");

/**
 * Full-screen, transparent overlay so the particle field converges behind it.
 * The counter is driven by real readiness (fonts + window load + a minimum
 * beat) and can never hold the page past the hard cap.
 */
export function Preloader() {
  const [mounted, setMounted] = useState(true);
  const root = useRef<HTMLDivElement>(null);
  const counter = useRef<HTMLSpanElement>(null);
  const counterMask = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const phase = useRef<HTMLSpanElement>(null);
  const top = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const finishReady = () => signalStore.getState().set({ ready: true });

    if (alreadySeen()) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- sessionStorage is client-only, so the skip decision can only be made after mount
      setMounted(false);
      finishReady();
      return;
    }

    const unlock = lockScroll();
    let done = false;
    let fontsReady = !document.fonts;
    let loaded = document.readyState === "complete";
    const start = performance.now();
    const minMs = reduced ? MIN_MS_REDUCED : MIN_MS;
    let shown = 0;
    let phaseIdx = -1;

    document.fonts?.ready.then(
      () => (fontsReady = true),
      () => (fontsReady = true),
    );
    if (!loaded) window.addEventListener("load", () => (loaded = true), { once: true });

    const render = (v: number) => {
      if (counter.current) counter.current.textContent = pad3(v);
      if (bar.current) bar.current.style.transform = `scaleX(${v / 100})`;
      const idx = v >= 99.5 ? 2 : v >= 45 ? 1 : 0;
      if (idx !== phaseIdx && phase.current) {
        phaseIdx = idx;
        phase.current.textContent = PHASES[idx];
      }
    };

    const leave = () => {
      if (done) return;
      done = true;
      markSeen();
      const finish = () => {
        unlock();
        setMounted(false);
        finishReady();
      };
      if (reduced) {
        gsap.to(el, { opacity: 0, duration: 0.5, onComplete: finish });
        return;
      }
      gsap
        .timeline({ onComplete: finish })
        .to(counterMask.current, { yPercent: -105, duration: 0.9, ease: "expo.inOut" }, 0)
        .to(bar.current, { scaleX: 0, transformOrigin: "100% 50%", duration: 0.9, ease: "expo.inOut" }, 0)
        .to([phase.current, top.current], { opacity: 0, y: -10, duration: 0.5, ease: "power2.in", stagger: 0.05 }, 0)
        // Hand over to the hero just before the wipe settles so the two overlap.
        .call(finishReady, undefined, 0.65);
    };

    const tick = () => {
      if (done) return;
      const elapsed = performance.now() - start;
      const forced = elapsed >= FORCE_MS;
      const timeP = Math.min(1, elapsed / minMs);
      const ready = fontsReady && loaded;
      // Asset-bound work holds the counter at 92 until it is actually done.
      const target = forced ? 100 : ready ? timeP * 100 : Math.min(timeP, 0.92) * 92;
      const eased = shown + (target - shown) * (forced ? 0.25 : 0.14);
      shown = target - eased < 0.4 ? target : eased;
      render(shown);
      if (shown >= 100) {
        gsap.ticker.remove(tick);
        gsap.delayedCall(0.25, leave);
      }
    };

    render(0);
    gsap.ticker.add(tick);
    const cap = window.setTimeout(() => {
      leave();
      finishReady();
    }, HARD_CAP_MS);

    if (!reduced) {
      gsap.from([top.current, phase.current], { opacity: 0, y: 10, duration: 0.8, ease: "expo.out", stagger: 0.1, delay: 0.1 });
    }

    return () => {
      window.clearTimeout(cap);
      gsap.ticker.remove(tick);
      unlock();
    };
  }, []);

  if (!mounted) return null;

  return (
    <div
      ref={root}
      role="status"
      aria-live="polite"
      aria-label="Loading"
      className="chrome-preloader fixed inset-0 z-[100] flex flex-col justify-between px-[var(--gutter)] pb-[var(--gutter)] pt-7 text-ink"
    >
      <noscript>
        <style>{`.chrome-preloader{display:none!important}`}</style>
      </noscript>
      <div ref={top} className="flex items-start justify-between">
        <span className="label !text-ink">CALIBRATING SIGNAL</span>
        <span className="label text-right">
          <span className="text-accent">DB</span>
          <span className="mx-2 text-dim">/</span>
          PORTFOLIO
        </span>
      </div>

      <div>
        <p className="mb-3 flex justify-end">
          <span ref={phase} className="label">
            RESOLVING NOISE
          </span>
        </p>
        <div ref={counterMask} className="overflow-hidden pb-[0.04em]">
          <span
            ref={counter}
            aria-hidden
            className="num block font-mono font-light leading-[0.82] tracking-[-0.06em]"
            style={{ fontSize: "clamp(6rem, 30vw, 19rem)" }}
          >
            000
          </span>
        </div>
        <div className="mt-5 h-px w-full bg-hairline-strong">
          <div ref={bar} className="h-full w-full origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
        </div>
      </div>
    </div>
  );
}
