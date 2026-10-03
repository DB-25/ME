"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { gsap, isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

type Props = {
  children: ReactNode;
  /** 0..1, fraction of the pointer offset the child follows. */
  strength?: number;
  /** Extra hit area in px around the child so the pull starts before the pointer arrives. */
  pad?: number;
  className?: string;
};

/**
 * Subtle pull toward the cursor, spring back on leave. Pointer events live on a
 * static outer shell and only the inner element moves, so the hover area never
 * jitters. No-op on touch and with reduced motion.
 */
export function Magnetic({ children, strength = 0.3, pad = 14, className }: Props) {
  const outer = useRef<HTMLSpanElement>(null);
  const inner = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const shell = outer.current;
    const mover = inner.current;
    if (!shell || !mover || isCoarsePointer() || prefersReducedMotion()) return;

    const onMove = (e: PointerEvent) => {
      const r = shell.getBoundingClientRect();
      const dx = e.clientX - (r.left + r.width / 2);
      const dy = e.clientY - (r.top + r.height / 2);
      gsap.to(mover, { x: dx * strength, y: dy * strength, duration: 0.45, ease: "power3.out", overwrite: true });
    };
    const onLeave = () => {
      gsap.to(mover, { x: 0, y: 0, duration: 1, ease: "elastic.out(1, 0.35)", overwrite: true });
    };

    shell.addEventListener("pointermove", onMove);
    shell.addEventListener("pointerleave", onLeave);
    return () => {
      shell.removeEventListener("pointermove", onMove);
      shell.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf(mover);
    };
  }, [strength]);

  return (
    <span ref={outer} className={`inline-block ${className ?? ""}`} style={{ padding: pad, margin: -pad }}>
      <span ref={inner} className="inline-block will-change-transform">
        {children}
      </span>
    </span>
  );
}
