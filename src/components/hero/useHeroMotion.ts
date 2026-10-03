"use client";

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react";
import { gsap, ScrollTrigger, isCoarsePointer, prefersReducedMotion } from "@/lib/motion";
import { useSignal } from "@/lib/signal-store";

const SPREAD_FIRST = 30;
const SPREAD_LAST = 20;
const SCRUB_VH = 0.45;
const WAVE_LIFT = -0.1; // em
const WAVE_SIGMA = 0.75; // em

/**
 * Hero choreography: pre-intro state, intro after the preloader hands over,
 * scrubbed scroll-out, and the hover wave over the name.
 *
 * Contract with the markup: glyphs are `[data-ch]` inside `[data-mask]`, name
 * lines are `[data-line]`, quiet text rows are `[data-meta]` inside `[data-out]`
 * containers, rules are `[data-rule]`. Intro animates the leaves, scroll-out
 * animates the containers, so the two never fight over a property.
 */
export function useHeroMotion(root: RefObject<HTMLElement | null>) {
  const ready = useSignal((s) => s.ready);
  const introDone = useRef(false);
  const played = useRef(false);

  // Park everything in its pre-intro pose before first paint.
  useLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    if (prefersReducedMotion()) {
      el.removeAttribute("data-intro");
      introDone.current = true;
      return;
    }
    gsap.set(el.querySelectorAll("[data-ch]"), { yPercent: 115 });
    gsap.set(el.querySelectorAll("[data-meta]"), { opacity: 0, y: 14 });
    gsap.set(el.querySelectorAll("[data-rule]"), { scaleX: 0, transformOrigin: "0% 50%" });
    gsap.set(el.querySelectorAll("[data-mark]"), { opacity: 0 });
    el.removeAttribute("data-intro");
  }, [root]);

  // Intro, once the preloader says ready.
  useEffect(() => {
    const el = root.current;
    if (!ready || !el || played.current || prefersReducedMotion()) return;
    played.current = true;

    const first = el.querySelectorAll("[data-line='first'] [data-ch]");
    const last = el.querySelectorAll("[data-line='last'] [data-ch]");
    const tl = gsap.timeline({
      defaults: { ease: "expo.out" },
      onComplete: () => {
        introDone.current = true;
        gsap.set(el.querySelectorAll("[data-mask]"), { overflow: "visible" });
      },
    });
    tl.to(first, { yPercent: 0, duration: 1.3, stagger: 0.07 }, 0.05)
      .to(last, { yPercent: 0, duration: 1.3, stagger: 0.04 }, 0.3)
      .to("#hero [data-rule]", { scaleX: 1, duration: 1.6, stagger: 0.12 }, 0.5)
      .to("#hero [data-mark]", { opacity: 1, duration: 1.2 }, 0.6)
      .to("#hero [data-meta]:not([data-cue])", { opacity: 1, y: 0, duration: 1, stagger: 0.07 }, 0.75)
      .to("#hero [data-cue]", { opacity: 1, y: 0, duration: 1 }, 1.6);

    return () => {
      tl.kill();
    };
  }, [ready, root]);

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
        .fromTo("#hero [data-out]", { opacity: 1, y: 0 }, { opacity: 0, y: -28, ease: "power1.in", duration: 0.6 }, 0);
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
        if (!introDone.current) return;
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
