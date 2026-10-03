"use client";

import { useRef, type PointerEvent } from "react";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

const WAVE_RADIUS = 150;

/**
 * The email, huge. Letters near the pointer lift and warm toward the accent.
 * Each letter reads one CSS variable (--k, 0..1) so the wave costs one style
 * write per letter and the easing lives in CSS.
 */
export function EmailLink({ email, onActivate }: { email: string; onActivate: () => void }) {
  const link = useRef<HTMLAnchorElement>(null);
  const [local, domain] = email.split("@");

  const letters = (text: string, offset: number) =>
    Array.from(text).map((ch, i) => (
      <span key={offset + i} data-ch aria-hidden className="email-ch inline-block">
        {ch}
      </span>
    ));

  const setWave = (clientX: number | null) => {
    const root = link.current;
    if (!root) return;
    for (const el of root.querySelectorAll<HTMLElement>("[data-ch]")) {
      if (clientX === null) {
        el.style.setProperty("--k", "0");
        continue;
      }
      const r = el.getBoundingClientRect();
      const d = (clientX - (r.left + r.width / 2)) / WAVE_RADIUS;
      el.style.setProperty("--k", Math.exp(-d * d).toFixed(3));
    }
  };

  const enabled = () => !isCoarsePointer() && !prefersReducedMotion();
  const onMove = (e: PointerEvent) => enabled() && setWave(e.clientX);

  return (
    <a
      ref={link}
      href={`mailto:${email}`}
      onClick={onActivate}
      onPointerMove={onMove}
      onPointerLeave={() => setWave(null)}
      onBlur={() => setWave(null)}
      aria-label={`Email ${email}`}
      data-cursor="write"
      className="email-link block whitespace-nowrap font-medium leading-[1.02] tracking-[-0.05em]"
    >
      <span>{letters(local, 0)}</span>
      <span>{letters(`@${domain}`, local.length)}</span>
    </a>
  );
}
