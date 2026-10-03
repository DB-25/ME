"use client";

import { useEffect, useRef, type ElementType, type ReactNode } from "react";
import { gsap, EASE_OUT, DUR_REVEAL, prefersReducedMotion } from "@/lib/motion";

type Props = { as?: ElementType; children: ReactNode; className?: string; delay?: number; y?: number };

/**
 * Soft rise for body copy. Uses explicit fromTo values and clears them on cleanup,
 * so a remount (React strict mode, a layout swap) never leaves the element stuck at its start state.
 */
export function FadeIn({ as = "div", children, className, delay = 0, y = 28 }: Props) {
  const Tag = as as "div";
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const tween = gsap.fromTo(
      el,
      reduced ? { opacity: 0 } : { y, opacity: 0 },
      {
        ...(reduced ? {} : { y: 0 }),
        opacity: 1,
        duration: reduced ? 0.6 : DUR_REVEAL,
        ease: EASE_OUT,
        delay,
        clearProps: "transform,opacity",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      },
    );
    return () => {
      tween.scrollTrigger?.kill();
      tween.kill();
      gsap.set(el, { clearProps: "transform,opacity" });
    };
  }, [y, delay]);

  return (
    <Tag ref={ref} className={className}>
      {children}
    </Tag>
  );
}
