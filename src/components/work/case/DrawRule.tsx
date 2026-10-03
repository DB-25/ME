"use client";

import { useEffect, useRef } from "react";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";

/** A hairline that draws left to right when it scrolls into view. Color comes from --pa. */
export function DrawRule({ accent = false, delay = 0, immediate = false }: { accent?: boolean; delay?: number; immediate?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (prefersReducedMotion()) return;
    const scrollTrigger = immediate ? undefined : { trigger: el, start: "top 92%", once: true };
    const t = gsap.from(el, { scaleX: 0, transformOrigin: "left center", duration: 1.5, ease: EASE_OUT, delay, scrollTrigger });
    return () => {
      t.scrollTrigger?.kill();
      t.kill();
    };
  }, [delay, immediate]);
  return <div ref={ref} aria-hidden className={accent ? "cs-rule cs-rule-accent" : "cs-rule"} />;
}
