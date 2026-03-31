"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

// Register plugins once
if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Check if user prefers reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Check if viewport is below mobile breakpoint (768px).
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return window.innerWidth < 768;
}

/**
 * Create a pinned scroll sequence timeline bound to a container element.
 *
 * Returns a GSAP timeline with ScrollTrigger pin + scrub attached.
 * The caller adds tweens to the returned timeline using normalized
 * positions (e.g. 0, 0.2, 0.4 ...).
 *
 * @param trigger  The DOM element to pin
 * @param opts     Optional overrides for scroll distance and scrub speed
 */
export function createPinnedTimeline(
  trigger: HTMLElement,
  opts: { scrollDistance?: string; scrub?: number } = {}
): gsap.core.Timeline {
  const { scrollDistance = "200vh", scrub = 1 } = opts;

  const tl = gsap.timeline({
    scrollTrigger: {
      trigger,
      start: "top top",
      end: `+=${scrollDistance}`,
      pin: true,
      scrub,
      anticipatePin: 1,
    },
  });

  return tl;
}

export { gsap, ScrollTrigger };
