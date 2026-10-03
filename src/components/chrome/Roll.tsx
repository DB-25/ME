"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, prefersReducedMotion } from "@/lib/motion";

const LINE = "1.5em";

/**
 * Mono text whose characters roll vertically (odometer style) when `value`
 * changes. Only the characters that differ move. Needs a monospace font so the
 * columns never change width.
 */
export function Roll({ value, className = "" }: { value: string; className?: string }) {
  const host = useRef<HTMLSpanElement>(null);
  const prev = useRef<string | null>(null);

  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const before = prev.current;
    prev.current = value;
    const animate = before !== null && before !== value && !prefersReducedMotion();
    const len = Math.max(value.length, before?.length ?? 0);
    const nbsp = (c: string | undefined) => (c === undefined || c === " " ? " " : c);

    el.textContent = "";
    const stacks: HTMLElement[] = [];
    for (let i = 0; i < len; i++) {
      const col = document.createElement("span");
      col.style.cssText = `display:inline-block;overflow:hidden;height:${LINE};vertical-align:top;`;
      const stack = document.createElement("span");
      stack.style.cssText = "display:flex;flex-direction:column;";
      const cur = nbsp(value[i]);
      const old = nbsp(before?.[i]);
      const differs = animate && cur !== old;
      for (const ch of differs ? [old, cur] : [cur]) {
        const cell = document.createElement("span");
        cell.style.cssText = `display:block;height:${LINE};line-height:${LINE};`;
        cell.textContent = ch;
        stack.appendChild(cell);
      }
      if (differs) stacks.push(stack);
      col.appendChild(stack);
      el.appendChild(col);
    }
    if (!stacks.length) return;
    const tween = gsap.fromTo(
      stacks,
      { yPercent: 0 },
      { yPercent: -50, duration: 0.85, ease: "expo.out", stagger: 0.045 },
    );
    return () => {
      tween.kill();
    };
  }, [value]);

  return (
    <span className={className}>
      <span className="sr-only">{value}</span>
      <span ref={host} aria-hidden className="inline-block whitespace-pre" />
    </span>
  );
}
