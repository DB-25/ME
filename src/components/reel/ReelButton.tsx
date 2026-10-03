"use client";

import { useState } from "react";
import { REEL } from "./reel";
import { ReelModal } from "./ReelModal";

const GLYPH_CSS = `.reel-glyph { display: inline-block; width: 0.62em; height: 0.62em; margin-right: 0.45em; flex: none; fill: currentColor; color: var(--color-accent-hot); }`;

/**
 * Understated text link that opens the showreel. Pass the host row's own classes so it matches its
 * neighbours (the hero passes its CTA classes); without them it is a plain button.
 */
export function ReelButton({ className, labelClassName }: { className?: string; labelClassName?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <style>{GLYPH_CSS}</style>
      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
        data-cursor="play"
        aria-haspopup="dialog"
        aria-label={`Watch the reel, ${REEL.durationSpoken}`}
      >
        <svg aria-hidden viewBox="0 0 10 10" className="reel-glyph">
          <path d="M1.5 0.8 9 5 1.5 9.2Z" />
        </svg>
        <span className={labelClassName}>
          Watch the reel, <span className="num">{REEL.durationLabel}</span>
        </span>
      </button>
      <ReelModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
