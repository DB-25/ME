"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "@/lib/motion";
import type { DirectorState } from "./types";

const BAR_EXIT_MS = 1000;

type Props = {
  state: DirectorState;
  onCut: () => void;
  showAnotherTake: boolean;
  onAnotherTake: () => void;
};

export function DirectorHud({ state, onCut, showAnotherTake, onAnotherTake }: Props) {
  const running = state.phase !== "idle";
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(false);
  const [still, setStill] = useState(false);
  const againRef = useRef<HTMLButtonElement>(null);

  // Focus has to land somewhere sensible when the take ends away from the input.
  useEffect(() => {
    if (showAnotherTake) againRef.current?.focus({ preventScroll: true });
  }, [showAnotherTake]);

  // Mount the overlay, then slide the bars in on the next frame; reverse on exit.
  useEffect(() => {
    if (running) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- matchMedia is client-only; staged mount/exit is intentional
      setStill(prefersReducedMotion());
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setOn(true)));
      return () => cancelAnimationFrame(raf);
    }
    setOn(false);
    const t = setTimeout(() => setMounted(false), BAR_EXIT_MS);
    return () => clearTimeout(t);
  }, [running]);

  useEffect(() => {
    if (!running) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCut();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [running, onCut]);

  const overlay =
    mounted &&
    createPortal(
      <div className={`${on ? "dir-on" : ""} ${still ? "dir-still" : ""}`} data-director-hud>
        <div
          className="dir-bar dir-bar-top dir-hairline-top flex items-center"
          style={{ height: "clamp(48px, 7vh, 72px)" }}
        >
          <div className="shell flex items-center gap-4 md:gap-8">
            <p className="label flex items-center gap-3 text-ink">
              <span className="dir-rec" aria-hidden />
              Director
            </p>
            <p className="label hidden min-w-0 flex-1 truncate text-dim lg:block">&ldquo;{state.prompt}&rdquo;</p>
            <p className="label ml-auto hidden text-muted md:block">
              {state.mode === "live" ? "Live" : "Offline, scripted"}
            </p>
            <button
              type="button"
              onClick={onCut}
              className="label ml-auto border border-hairline-strong px-3 py-2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent-hot md:ml-0"
            >
              Stop <span className="ml-1 text-dim">Esc</span>
            </button>
          </div>
        </div>

        <div
          className="dir-sub-wrap"
          style={{ bottom: "var(--dir-bottom)", paddingBottom: "clamp(16px, 3vh, 36px)" }}
          aria-hidden
        >
          <div className="dir-sub">
            <p>
              {state.words.map((w) => (
                <span key={w.id} className="dir-word">
                  {w.text}
                </span>
              ))}
            </p>
          </div>
        </div>

        <div
          className="dir-bar dir-bar-bottom dir-hairline-bottom flex items-center"
          style={{ height: "var(--dir-bottom)" }}
        >
          <div className="shell flex items-end justify-between gap-6">
            <ul className="label min-w-0 space-y-1" aria-label="Actions taken">
              {state.log.slice(-3).map((line) => (
                <li key={line.id} className="dir-log-line truncate text-muted">
                  <span className="text-accent">&rarr;</span> {line.text}
                </li>
              ))}
            </ul>
            {state.figure && (
              <p key={state.figure.n} className="label dir-fig hidden max-w-[40ch] text-right text-ink sm:block">
                <span className="text-accent">Fig. {state.figure.n}</span>
                <span className="mx-2 text-dim">/</span>
                {state.figure.label}
              </p>
            )}
          </div>
        </div>
      </div>,
      document.body,
    );

  return (
    <>
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {state.spoken}
      </div>
      {overlay}
      {showAnotherTake &&
        createPortal(
          <button ref={againRef} type="button" onClick={onAnotherTake} className="label link dir-again border border-hairline-strong bg-void/80 px-4 py-3 text-ink backdrop-blur-sm">
            <span className="text-accent">&uarr;</span> Again
          </button>,
          document.body,
        )}
    </>
  );
}
