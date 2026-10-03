"use client";

import { useEffect, useState } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { signalStore } from "@/lib/signal-store";

const SECRET = "db25";
const TOAST_MS = 2800;
const ENERGY_FADE_S = 2;
const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;

/**
 * Type "db25" anywhere (outside text fields): the particle field gets a burst of
 * energy that eases back to calm, and the returned flag drives a toast.
 */
export function useEasterEgg(): boolean {
  const [toast, setToast] = useState(false);

  useEffect(() => {
    let buffer = "";
    let tween: gsap.core.Tween | null = null;
    let hideTimer: number | undefined;

    const celebrate = () => {
      setToast(true);
      window.clearTimeout(hideTimer);
      hideTimer = window.setTimeout(() => setToast(false), TOAST_MS);
      if (prefersReducedMotion()) return;
      tween?.kill();
      const level = { e: 1 };
      signalStore.getState().set({ energy: 1 });
      tween = gsap.to(level, {
        e: 0,
        duration: ENERGY_FADE_S,
        ease: "power2.out",
        onUpdate: () => signalStore.getState().set({ energy: level.e }),
      });
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.key.length !== 1) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || EDITABLE.test(t.tagName))) return;
      buffer = (buffer + e.key.toLowerCase()).slice(-SECRET.length);
      if (buffer !== SECRET) return;
      buffer = "";
      celebrate();
    };

    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.clearTimeout(hideTimer);
      if (tween) {
        tween.kill();
        signalStore.getState().set({ energy: 0 });
      }
    };
  }, []);

  return toast;
}
