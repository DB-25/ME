"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import type { Metric } from "@/content";

const COUNT_SECONDS = 1.8;

const format = (n: number, suffix = "") => `${n.toLocaleString("en-US")}${suffix}`;

/**
 * A huge tabular number. The real value is always in the DOM (server markup, no-JS, reduced motion,
 * share previews, assistive tech). When it scrolls into view, a visual-only overlay counts up over it
 * and the real number is shown again the moment the count lands, so nothing ever reads a half-counted value.
 */
export function Counter({ metric, className }: { metric: Metric; className: string }) {
  const root = useRef<HTMLSpanElement>(null);
  const fx = useRef<HTMLSpanElement>(null);
  const final = metric.numeric === undefined ? metric.value : format(metric.numeric, metric.suffix);

  useEffect(() => {
    const host = root.current;
    const overlay = fx.current;
    if (!host || !overlay || metric.numeric === undefined || prefersReducedMotion()) return;
    const state = { v: 0 };
    const done = () => host.removeAttribute("data-counting");
    const tween = gsap.to(state, {
      v: metric.numeric,
      duration: COUNT_SECONDS,
      ease: "expo.out",
      paused: true,
      onUpdate: () => {
        overlay.textContent = format(Math.round(state.v), metric.suffix);
      },
      onComplete: done,
    });
    const trigger = ScrollTrigger.create({
      trigger: host,
      start: "top 88%",
      once: true,
      onEnter: () => {
        overlay.textContent = format(0, metric.suffix);
        host.setAttribute("data-counting", "");
        tween.play();
      },
    });
    return () => {
      trigger.kill();
      tween.kill();
      done();
    };
  }, [metric.numeric, metric.suffix]);

  return (
    <span ref={root} className="group relative block">
      <span className={`num block group-data-[counting]:opacity-0 ${className}`}>{final}</span>
      <span ref={fx} aria-hidden className={`num absolute inset-0 hidden group-data-[counting]:block ${className}`} />
    </span>
  );
}
