"use client";

import { useLayoutEffect, useRef } from "react";

/** The site's expo.out, as a CSS curve (Web Animations API takes it directly, so the demo needs no animation library). */
const EASE = "cubic-bezier(0.16, 1, 0.3, 1)";
const SLIDE = 40;
const BLUR = 6;

type Props = {
  /** The text as written: a name, an address, the profile name. */
  text: string;
  /** What replaces it: `[NAME]`, `{{S}}`. */
  token: string;
  /** Which of the two is showing. */
  on: "text" | "token";
  /** Stagger, in ms, so a page of identifiers dissolves in reading order. */
  delay?: number;
  student?: boolean;
  /** No highlight in the text state: for a name that is legitimately on screen (the parent's own view). */
  plain?: boolean;
};

/**
 * One identifier, with both of its states in the DOM. Only one layer is in flow (and readable); the other is
 * absolutely placed and hidden. When `on` flips, the old text blurs up and out while the token rises in, and the
 * box tweens between the two measured widths so the line closes up (or opens up) instead of jumping.
 * Reduced motion skips the tween: the CSS state swaps at once.
 */
export function Ent({ text, token, on, delay = 0, student = false, plain = false }: Props) {
  const box = useRef<HTMLSpanElement>(null);
  const layerText = useRef<HTMLSpanElement>(null);
  const layerToken = useRef<HTMLSpanElement>(null);
  const seen = useRef(on);

  useLayoutEffect(() => {
    if (seen.current === on) return;
    seen.current = on;
    const root = box.current;
    const a = layerText.current;
    const b = layerToken.current;
    if (!root || !b || !a || typeof root.animate !== "function") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const toToken = on === "token";
    const out = toToken ? a : b;
    const into = toToken ? b : a;
    const pad = root.offsetWidth - into.offsetWidth;
    const from = out.offsetWidth + pad;
    const to = root.offsetWidth;
    const base = { easing: EASE, delay, fill: "backwards" as const };
    const anims = [
      root.animate([{ width: `${from}px` }, { width: `${to}px` }], { ...base, duration: 800 }),
      out.animate(
        [
          { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
          { opacity: 0, filter: `blur(${BLUR}px)`, transform: `translateY(-${SLIDE}%)` },
        ],
        { ...base, duration: 650 },
      ),
      into.animate(
        [
          { opacity: 0, filter: `blur(${BLUR}px)`, transform: `translateY(${SLIDE}%)` },
          { opacity: 1, filter: "blur(0px)", transform: "translateY(0)" },
        ],
        { ...base, delay: delay + 140, duration: 800 },
      ),
    ];
    return () => anims.forEach((x) => x.cancel());
  }, [on, delay]);

  return (
    <span ref={box} className="wss-ent" data-on={on} data-student={student || undefined} data-plain={plain || undefined}>
      <span ref={layerText} className="wss-lt" aria-hidden={on === "token" || undefined}>
        {text}
      </span>
      <span ref={layerToken} className="wss-lk" aria-hidden={on === "text" || undefined}>
        {token}
      </span>
    </span>
  );
}
