"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, SplitText, EASE_OUT, DUR_REVEAL, prefersReducedMotion } from "@/lib/motion";

type Props = {
  as?: "div" | "p" | "span" | "h1" | "h2" | "h3" | "h4" | "li" | "blockquote";
  children: ReactNode;
  className?: string;
  /** "lines" = masked line slide-up (headlines). "fade" = soft rise (body, media). */
  mode?: "lines" | "fade";
  delay?: number;
  /** Play immediately instead of on scroll (e.g. hero after preloader). */
  immediate?: boolean;
  /** Keep non-breaking spaces when splitting lines (SplitText otherwise folds them into plain spaces). */
  keepSpaces?: boolean;
};

/** The house reveal. Use it for every headline and most body copy. */
export function Reveal({ as: Tag = "div", children, className, mode = "lines", delay = 0, immediate = false, keepSpaces = false }: Props) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // gsap.context().revert() restores the original styles, so StrictMode's
    // double-invoked effects never leave the element stuck at its "from" state.
    const ctx = gsap.context(() => {
      if (prefersReducedMotion()) {
        gsap.fromTo(el, { opacity: 0 }, { opacity: 1, duration: 0.6, delay });
        return;
      }
      const scrollTrigger = immediate ? undefined : { trigger: el, start: "top 85%", once: true };
      if (mode === "lines") {
        const split = SplitText.create(el, {
          type: "lines",
          mask: "lines",
          linesClass: "reveal-line",
          aria: "none",
          reduceWhiteSpace: !keepSpaces,
        });
        gsap.fromTo(
          split.lines,
          { yPercent: 110 },
          { yPercent: 0, duration: DUR_REVEAL, ease: EASE_OUT, stagger: 0.08, delay, scrollTrigger },
        );
        return;
      }
      gsap.fromTo(
        el,
        { y: 32, opacity: 0 },
        { y: 0, opacity: 1, duration: DUR_REVEAL, ease: EASE_OUT, delay, scrollTrigger },
      );
    }, el);

    return () => ctx.revert();
  }, [mode, delay, immediate, keepSpaces]);

  const Component = Tag as "div";
  return (
    <Component ref={ref as React.RefObject<HTMLDivElement>} className={className}>
      {children}
    </Component>
  );
}
