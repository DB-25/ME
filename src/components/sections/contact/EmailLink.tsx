"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

const WAVE_RADIUS = 150;
/** The address is sized to fill this share of its box, whatever the engine's font metrics. */
const FIT_FILL = 0.97;
const FIT_MIN = 0.5;
const FIT_MAX = 1.2;

/**
 * The email, huge. Letters near the pointer lift and warm toward the accent.
 * Each letter reads one CSS variable (--k, 0..1) so the wave costs one style
 * write per letter and the easing lives in CSS.
 */
export function EmailLink({ email, onActivate }: { email: string; onActivate: () => void }) {
  const link = useRef<HTMLAnchorElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [local, domain] = email.split("@");

  // Font metrics differ per engine (iOS Safari runs wider than headless Chrome), so after the CSS size
  // lands, measure the text itself (not the block, which is always as wide as its box) once per resize
  // and scale the type so the address fills its row with a small margin, never clipped.
  useEffect(() => {
    const box = wrap.current;
    const a = link.current;
    const t = text.current;
    if (!box || !a || !t) return;
    const fit = () => {
      a.style.removeProperty("--fit");
      const need = t.getBoundingClientRect().width;
      if (!need) return;
      const scale = Math.min(FIT_MAX, Math.max(FIT_MIN, (box.clientWidth * FIT_FILL) / need));
      a.style.setProperty("--fit", scale.toFixed(4));
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
      className="email-link block whitespace-nowrap pointer-coarse:py-2 font-medium leading-[1.02] tracking-[-0.05em]"
    >
      <span ref={text} className="inline-block">
        <span>{letters(local, 0)}</span>
        <span>{letters(`@${domain}`, local.length)}</span>
      </span>
    </a>
    </div>
  );
}
