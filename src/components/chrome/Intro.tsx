"use client";

import { useEffect } from "react";
import { signalStore } from "@/lib/signal-store";

/** Upper bound for the handover: fonts that are not here by now do not hold the field. */
const READY_CAP_MS = 600;

/**
 * Non-blocking intro. There is no overlay: the hero text, proof and links are in
 * the first paint. All this does is tell the particle field it may start its
 * noise-to-signal morph, after first paint and fonts (never later than 600ms).
 * Reduced motion: handed over immediately, the field settles with a quick fade.
 */
export function Intro() {
  useEffect(() => {
    const set = signalStore.getState().set;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      set({ ready: true });
    };

    const cap = window.setTimeout(finish, READY_CAP_MS);
    let raf = 0;
    // Two frames: the first commits the paint, the second runs after it.
    raf = requestAnimationFrame(() => {
      raf = requestAnimationFrame(() => {
        const fonts = document.fonts?.ready;
        if (!fonts) return finish();
        fonts.then(finish, finish);
      });
    });

    return () => {
      window.clearTimeout(cap);
      cancelAnimationFrame(raf);
    };
  }, []);

  return null;
}
