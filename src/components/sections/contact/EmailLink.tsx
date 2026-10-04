"use client";

import { useEffect, useRef, type PointerEvent } from "react";
import { gsap, ScrollTrigger, EASE_OUT, isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

const WAVE_RADIUS = 150;
/** The address is sized to fill this share of its box, whatever the engine's font metrics. */
const FIT_FILL = 0.97;
const FIT_MIN = 0.5;
const FIT_MAX = 1.2;
/** How long the copy sweep runs, so the flag can clear before the next copy. */
const SWEEP_MS = 1400;

const CSS = `
.email-ch {
  --k: 0;
  --in: 0;
  color: color-mix(in oklab, var(--color-ink), var(--color-accent-hot) calc(var(--k) * 100%));
  transform: translateY(calc(var(--k) * -0.16em));
  translate: 0 calc(var(--in) * 0.55em);
  transition: transform 0.45s var(--ease-out-expo), color 0.45s var(--ease-out-expo);
}
.email-wrap { container-type: inline-size; }
.email-link { --fit: 1; font-size: calc(min(100cqi / 12, 4.5rem) * var(--fit)); }
@media (min-width: 768px) { .email-link { font-size: calc(min(7.6vw, 7.9rem) * var(--fit)); } }
.email-link:focus-visible { outline-offset: 10px; }

/* The rule under the address: a hairline that draws in on arrival and carries a lit spot under the pointer. */
.email-rule { position: relative; height: 1px; margin-top: clamp(10px, 1.4vw, 20px); background: var(--color-hairline-strong); overflow: hidden; }
.email-rule::before {
  content: ""; position: absolute; inset: 0; background: rgb(139 123 255 / 0.5);
  transform: scaleX(var(--draw, 1)); transform-origin: left center;
}
.email-rule::after {
  content: ""; position: absolute; inset: 0; opacity: var(--lit, 0);
  background: radial-gradient(circle 220px at var(--mx, 50%) 50%, var(--color-accent-hot), transparent);
  transition: opacity 0.4s var(--ease-out-expo);
}

/* Copy: a sweep of light runs left to right through the letters. */
@keyframes email-sweep {
  0% { transform: translateY(0); color: var(--color-ink); }
  30% { transform: translateY(-0.14em); color: var(--color-accent-hot); }
  100% { transform: translateY(0); color: var(--color-ink); }
}
.email-link[data-sweep] .email-ch { animation: email-sweep 0.9s var(--ease-out-expo) calc(var(--i) * 22ms) both; }
`;

/**
 * The email, huge. On arrival the letters rise in on a stagger and a hairline draws under them; letters near the
 * pointer lift and warm toward the accent, a lit spot rides the hairline; a copy sends a sweep through the address.
 * Each letter reads CSS variables (--k wave, --in entrance, --i index) so every effect costs one style write per
 * letter and the easing lives in CSS.
 */
export function EmailLink({ email, onActivate, sweep = 0 }: { email: string; onActivate: () => void; sweep?: number }) {
  const link = useRef<HTMLAnchorElement>(null);
  const wrap = useRef<HTMLDivElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const rule = useRef<HTMLDivElement>(null);
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

  // Arrival: letters rise on a stagger once the address is in view, then the hairline draws left to right.
  useEffect(() => {
    const a = link.current;
    const r = rule.current;
    if (!a || !r || prefersReducedMotion()) return;
    const letters = a.querySelectorAll<HTMLElement>("[data-ch]");
    const ctx = gsap.context(() => {
      gsap.set(letters, { "--in": 1, opacity: 0 });
      gsap.set(r, { "--draw": 0 });
      ScrollTrigger.create({
        trigger: a,
        start: "top 90%",
        once: true,
        onEnter: () => {
          gsap
            .timeline()
            .to(letters, { "--in": 0, opacity: 1, duration: 1, ease: EASE_OUT, stagger: 0.028, clearProps: "opacity" }, 0)
            .to(r, { "--draw": 1, duration: 1.4, ease: EASE_OUT }, 0.25);
        },
      });
    }, a);
    return () => ctx.revert();
  }, [email]);

  // Copy: replay the sweep. The flag is cleared after the animation so the next copy restarts it.
  useEffect(() => {
    const a = link.current;
    if (!a || !sweep || prefersReducedMotion()) return;
    a.setAttribute("data-sweep", "");
    const id = window.setTimeout(() => a.removeAttribute("data-sweep"), SWEEP_MS);
    return () => {
      window.clearTimeout(id);
      a.removeAttribute("data-sweep");
    };
  }, [sweep]);

  const letters = (text: string, offset: number) =>
    Array.from(text).map((ch, i) => (
      <span key={offset + i} data-ch aria-hidden className="email-ch inline-block" style={{ ["--i" as string]: offset + i }}>
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
    const rl = rule.current;
    if (!rl) return;
    if (clientX === null) {
      rl.style.setProperty("--lit", "0");
      return;
    }
    const box = rl.getBoundingClientRect();
    rl.style.setProperty("--mx", `${clientX - box.left}px`);
    rl.style.setProperty("--lit", "1");
  };

  const enabled = () => !isCoarsePointer() && !prefersReducedMotion();
  const onMove = (e: PointerEvent) => enabled() && setWave(e.clientX);

  return (
    <div ref={wrap} className="email-wrap">
      <style>{CSS}</style>
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
      <div ref={rule} aria-hidden className="email-rule" />
    </div>
  );
}
