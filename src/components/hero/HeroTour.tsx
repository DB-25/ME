"use client";

import { useEffect, useRef, useState } from "react";
import { PERSONA_TOURS, requestTour, warmDirector } from "@/components/director/tourBus";

/** The chips lock briefly after a press: the Director chunk may still be loading, and a second press must not queue a second tour. */
const LOCK_MS = 2500;

const CSS = `
#hero .hero-tour { display: flex; flex-direction: column; gap: 6px; margin-top: 6px; }
#hero .hero-tour-label { display: flex; align-items: center; gap: 0.7em; color: var(--color-muted); }
#hero .hero-tour-label::before {
  content: ""; width: 0.6em; height: 0.6em; flex: none; background: var(--color-accent-hot);
  clip-path: polygon(0 0, 100% 50%, 0 100%);
}
#hero .hero-tour-list { display: flex; flex-wrap: wrap; gap: 8px; }
#hero .hero-chip {
  display: inline-flex; align-items: center; min-height: 44px; padding-inline: 12px;
  border: 1px solid rgb(238 234 246 / 0.22); border-radius: 2px; text-shadow: none;
  font-size: 13.5px; font-weight: 500; color: var(--color-ink); white-space: nowrap;
  transition: color 0.25s, border-color 0.25s, background-color 0.25s, opacity 0.25s;
}
#hero .hero-chip:hover, #hero .hero-chip:focus-visible { border-color: var(--color-accent-hot); color: var(--color-accent-hot); }
#hero .hero-chip:active { background: rgb(139 123 255 / 0.12); }
#hero .hero-chip[aria-disabled="true"] { opacity: 0.45; pointer-events: none; }
@media (min-width: 768px) { #hero .hero-chip { min-height: 36px; padding-inline: 14px; } }
@media (max-width: 400px) { #hero .hero-chip { padding-inline: 10px; font-size: 13px; } #hero .hero-tour-list { gap: 6px; } }
`;

/**
 * The Director as a front door: three persona chips start the matching 45-second guided tour straight
 * from the hero. The Director chapter further down stays for the free-text input and the other tours.
 */
export function HeroTour() {
  const [locked, setLocked] = useState(false);
  const timer = useRef<number>(0);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const start = (request: string) => {
    if (locked) return;
    setLocked(true);
    timer.current = window.setTimeout(() => setLocked(false), LOCK_MS);
    requestTour(request);
  };

  return (
    <div role="group" aria-labelledby="hero-tour-label" className="hero-tour">
      <style>{CSS}</style>
      <p id="hero-tour-label" className="label hero-tour-label">
        Take the 45-second tour
      </p>
      <ul className="hero-tour-list">
        {PERSONA_TOURS.map((t) => (
          <li key={t.id}>
            <button
              type="button"
              className="hero-chip"
              aria-disabled={locked || undefined}
              onClick={() => start(t.request)}
              onPointerEnter={warmDirector}
              onFocus={warmDirector}
              onTouchStart={warmDirector}
            >
              {t.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
