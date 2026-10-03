"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger, SplitText);
}

export { gsap, ScrollTrigger, SplitText };

export const EASE_OUT = "expo.out";
export const EASE_MORPH = "power2.inOut";
export const DUR_REVEAL = 1.1;
export const STAGGER = 0.06;

export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function isCoarsePointer(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(pointer: coarse)").matches;
}

/** Scroll smoothly to a chapter or element, using Lenis when it is running. */
export function scrollToTarget(target: string | HTMLElement, offset = 0) {
  const lenis = (window as unknown as { lenis?: { scrollTo: (t: string | HTMLElement, o?: object) => void } }).lenis;
  if (lenis) {
    lenis.scrollTo(target, { offset, duration: 1.6 });
    return;
  }
  const el = typeof target === "string" ? document.querySelector<HTMLElement>(target) : target;
  el?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
}
