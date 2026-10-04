"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

const WAVE_RADIUS = 150;
/** Shrink only when the address uses more than FIT_LIMIT of its box, then aim for FIT_TARGET. */
const FIT_LIMIT = 0.97;
const FIT_TARGET = 0.95;

/**
 * The email, huge. Letters near the pointer lift and warm toward the accent.
 * Each letter reads one CSS variable (--k, 0..1) so the wave costs one style
 * write per letter and the easing lives in CSS.
 */
export function EmailLink({ email, onActivate }: { email: string; onActivate: () => void }) {
  const link = useRef<HTMLAnchorElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const [local, domain] = email.split("@");

  // Font metrics differ per engine (iOS Safari runs wider than headless Chrome), so after the CSS size
  // lands, measure once per resize and shrink the type until the address fits with a small margin.
  useEffect(() => {
    const box = wrap.current;
    const a = link.current;
    if (!box || !a) return;
    const fit = () => {
      a.style.removeProperty("--fit");
      const room = box.clientWidth;
      const need = a.scrollWidth;
      if (need > room * FIT_LIMIT) a.style.setProperty("--fit", ((room * FIT_TARGET) / need).toFixed(4));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    void document.fonts?.ready.then(fit);
    return () => ro.disconnect();
  }, [email]);

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
    <div ref={wrap} className="email-wrap">
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
    </div>
  );
}
