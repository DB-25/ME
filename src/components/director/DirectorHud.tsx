"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { prefersReducedMotion } from "@/lib/motion";
import type { DirectorState } from "./types";
import { VoiceToggle } from "./VoiceToggle";

const BAR_EXIT_MS = 1000;
/** The log always occupies this many rows, so adding a line never changes the bar's layout. */
const LOG_ROWS = 3;

type Props = {
  state: DirectorState;
  /** Stop a take in progress, or close the bar once it has ended. */
  onCut: () => void;
  /** Close the bar and take the visitor back to the Director for another go. */
  onAnotherTake: () => void;
};

export function DirectorHud({ state, onCut, onAnotherTake }: Props) {
  const running = state.phase !== "idle";
  const finished = state.phase === "done";
  const [mounted, setMounted] = useState(false);
  const [on, setOn] = useState(false);
  const [still, setStill] = useState(false);
  const againRef = useRef<HTMLButtonElement>(null);

  // When the take ends the focus moves to "Again", so the keyboard has somewhere sensible to be.
  useEffect(() => {
    if (finished) againRef.current?.focus({ preventScroll: true });
  }, [finished]);

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
      <div className={`${on ? "dir-on" : ""} ${finished ? "dir-done" : ""} ${still ? "dir-still" : ""}`} data-director-hud>
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
              {state.mode === "live" ? "Live" : "Scripted tour"}
            </p>
            <div className="ml-auto flex items-center gap-3 md:ml-0">
              {finished ? (
                <button
                  ref={againRef}
                  type="button"
                  onClick={onAnotherTake}
                  className="label inline-flex items-center border border-accent px-3 py-2 text-ink transition-colors duration-300 hover:text-accent-hot pointer-coarse:min-h-11 pointer-coarse:px-4"
                >
                  <span className="text-accent">&uarr;</span> Again
                </button>
              ) : (
                <VoiceToggle />
              )}
              <button
                type="button"
                onClick={onCut}
                className="label inline-flex items-center border border-hairline-strong px-3 py-2 text-ink transition-colors duration-300 hover:border-accent hover:text-accent-hot pointer-coarse:min-h-11 pointer-coarse:px-4"
              >
                {finished ? "Close" : "Stop"} <span className="ml-1 text-dim pointer-coarse:hidden">Esc</span>
              </button>
            </div>
          </div>
        </div>

        <div className="dir-scrim" aria-hidden />
        <div
          className="dir-sub-wrap"
          style={{ bottom: "var(--dir-bottom)", paddingBottom: "clamp(16px, 3vh, 36px)" }}
          aria-hidden
        >
          <div className="dir-sub">
            {state.caption && (
              <p key={state.caption.id} className="dir-cap">
                {state.caption.words.map((w, i) => (
                  <span key={i} className={i < state.caption!.active ? "dir-w is-said" : i === state.caption!.active ? "dir-w is-now" : "dir-w"}>
                    {w}{" "}
                  </span>
                ))}
              </p>
            )}
          </div>
        </div>

        <div
          className="dir-bar dir-bar-bottom dir-hairline-bottom flex items-center"
          style={{ height: "var(--dir-bottom)" }}
        >
          <div className="shell flex items-end justify-between gap-6">
            <div className="dir-log label min-w-0">
              <ul key={state.log.at(-1)?.id ?? 0} className="dir-log-roll" aria-label="Actions taken">
                {Array.from({ length: LOG_ROWS }, (_, row) => {
                  const line = state.log.slice(-LOG_ROWS)[row - (LOG_ROWS - Math.min(LOG_ROWS, state.log.length))];
                  return (
                    <li key={row} className="dir-log-line truncate text-muted">
                      {line && (
                        <>
                          <span className="text-accent">&rarr;</span> {line.text}
                        </>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
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
    </>
  );
}
