"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import type { Metric } from "@/content";

const COUNT_SECONDS = 2.4;

const format = (n: number, suffix = "") => `${n.toLocaleString("en-US")}${suffix}`;

/** A huge tabular number that counts up once when it enters, expo.out. */
export function Counter({ metric, className }: { metric: Metric; className: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const final = metric.numeric === undefined ? metric.value : format(metric.numeric, metric.suffix);

  useEffect(() => {
    const el = ref.current;
    if (!el || metric.numeric === undefined || prefersReducedMotion()) return;
    const state = { v: 0 };
    el.textContent = format(0, metric.suffix);
    const tween = gsap.to(state, {
      v: metric.numeric,
      duration: COUNT_SECONDS,
      ease: "expo.out",
      paused: true,
      onUpdate: () => {
        el.textContent = format(Math.round(state.v), metric.suffix);
      },
      onComplete: () => {
        el.textContent = final;
      },
    });
    const trigger = ScrollTrigger.create({ trigger: el, start: "top 88%", once: true, onEnter: () => tween.play() });
    return () => {
      trigger.kill();
      tween.kill();
      el.textContent = final;
    };
  }, [metric.numeric, metric.suffix, final]);

  return (
    <>
      <span className="sr-only">{final}</span>
      <span ref={ref} aria-hidden className={`num block ${className}`}>
        {final}
      </span>
    </>
  );
}
