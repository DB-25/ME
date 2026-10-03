"use client";

import { useEffect, type RefObject } from "react";
import { gsap, ScrollTrigger, isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

const SPREAD_FIRST = 30;
const SPREAD_LAST = 20;
const SCRUB_VH = 0.55;
const WAVE_LIFT = -0.1; // em
const WAVE_SIGMA = 0.75; // em

/**
 * Hero choreography: scrubbed scroll-out and the hover wave over the name.
 *
 * There is no gated intro: every glyph, line and link is in the first paint, so the
 * hero text is the LCP and a recruiter can read it at once. The only "intro" is the
 * particle field's own noise-to-signal morph behind the text.
 *
 * Contract with the markup: glyphs are `[data-ch]`, name lines are `[data-line]`,
 * quiet text containers are `[data-out]`. Scroll-out animates the lines and
 * containers; the hover wave animates the leaves (y, color), so they never fight.
 */
export function useHeroMotion(root: RefObject<HTMLElement | null>) {
  // Scroll-out: name drifts apart, blurs, fades; quiet text leaves first.
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;

    const ctx = gsap.context(() => {
      const trigger = {
        trigger: el,
        start: "top top",
        end: () => `+=${Math.round(window.innerHeight * SCRUB_VH)}`,
        scrub: 0.6,
      };
      const spread = (dir: number, amount: number) => (i: number, _t: Element, list: Element[]) =>
        (i - (list.length - 1) / 2) * amount * dir;

      const firstChars = el.querySelectorAll("[data-line='first'] [data-ch]");
      const lastChars = el.querySelectorAll("[data-line='last'] [data-ch]");
      const tl = gsap.timeline({ scrollTrigger: trigger, defaults: { ease: "power2.in" } });
      tl.fromTo(
        "#hero [data-line='first']",
        { opacity: 1, y: 0, filter: "blur(0px)" },
        { opacity: 0, y: -110, filter: "blur(14px)" },
        0,
      )
        .fromTo(
          "#hero [data-line='last']",
          { opacity: 1, y: 0, filter: "blur(0px)" },
          { opacity: 0, y: 90, filter: "blur(14px)" },
          0,
        )
        .fromTo(firstChars, { x: 0 }, { x: spread(1, SPREAD_FIRST) }, 0)
        .fromTo(lastChars, { x: 0 }, { x: spread(1, SPREAD_LAST) }, 0)
        .fromTo("#hero [data-out]", { autoAlpha: 1, y: 0 }, { autoAlpha: 0, y: -28, ease: "power1.in", duration: 0.6 }, 0);
    }, el);

    return () => ctx.revert();
  }, [root]);

  // Hover wave: glyphs near the pointer lift and warm toward the hot accent.
  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion() || isCoarsePointer()) return;

    const cleanups: (() => void)[] = [];
    el.querySelectorAll<HTMLElement>("[data-line]").forEach((line) => {
      const chars = Array.from(line.querySelectorAll<HTMLElement>("[data-ch]"));
      const fontPx = () => parseFloat(getComputedStyle(line).fontSize);
      const lift = chars.map((c) => gsap.quickTo(c, "y", { duration: 0.6, ease: "power3.out" }));
      const hot = chars.map(() => false);
      const warm = (i: number, on: boolean) => {
        if (hot[i] === on) return;
        hot[i] = on;
        gsap.to(chars[i], { color: on ? "#c9beff" : "#eeeaf6", duration: 0.5, ease: "power2.out", overwrite: "auto" });
      };

      const onMove = (e: PointerEvent) => {
        const em = fontPx();
        chars.forEach((c, i) => {
          const r = c.getBoundingClientRect();
          const d = Math.abs(e.clientX - (r.left + r.width / 2)) / em;
          const k = Math.exp(-((d / WAVE_SIGMA) ** 2));
          lift[i](k * WAVE_LIFT * em);
          warm(i, k > 0.55);
        });
      };
      const onLeave = () => {
        chars.forEach((_, i) => {
          lift[i](0);
          warm(i, false);
        });
      };
      line.addEventListener("pointermove", onMove);
      line.addEventListener("pointerleave", onLeave);
      cleanups.push(() => {
        line.removeEventListener("pointermove", onMove);
        line.removeEventListener("pointerleave", onLeave);
        gsap.killTweensOf(chars, "y,color");
      });
    });
    return () => cleanups.forEach((fn) => fn());
  }, [root]);

  // Keep trigger positions honest after fonts settle.
  useEffect(() => {
    document.fonts?.ready.then(() => ScrollTrigger.refresh());
  }, []);
}
