"use client";

/**
 * GlassBox — the DB-1 full-screen "OS mode" overlay.
 *
 * When a visitor submits a question, this takes over the viewport: a 3D
 * neural field thinks (driven by real streamed tokens), the memory vault
 * shows retrieved docs, working notes stream live, and the answer
 * materializes as bento tiles. Honest framing throughout — stylized
 * visualization, real signals (tokens · sources · timings).
 */

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ComponentType,
} from "react";
import { createPortal } from "react-dom";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/animations/gsap-config";
import { getScene, type SceneId } from "@/components/command/bento-scenes";
import { BentoTile } from "@/components/command/BentoTile";
import {
  PHASE_ORDER,
  type GlassPhase,
  type NeuralFieldProps,
} from "./types";
import { useGlassBoxRun } from "./useGlassBoxRun";
import { VaultPanel } from "./VaultPanel";
import { PipelineTrace } from "./PipelineTrace";

// The heavy 3D field loads only when first rendered (desktop, motion-ok,
// overlay open). Dynamic import isolates this file from NeuralField's
// build status — it may still be in flight.
const NeuralField = dynamic<NeuralFieldProps>(
  () =>
    import("./NeuralField").then((mod) => {
      const m = mod as unknown as {
        default?: ComponentType<NeuralFieldProps>;
        NeuralField?: ComponentType<NeuralFieldProps>;
      };
      return (m.default ?? m.NeuralField) as ComponentType<NeuralFieldProps>;
    }),
  { ssr: false, loading: () => null }
);

// ---------------------------------------------------------------------------

const COMPOSE_IDX = PHASE_ORDER.indexOf("compose");

const PHASE_ANNOUNCE: Record<GlassPhase, string> = {
  idle: "Idle",
  tokenize: "Tokenizing the question",
  retrieve: "Retrieving sources from the memory vault",
  generate: "Generating the answer",
  compose: "Composing the answer tiles",
  eval: "Evaluating groundedness",
  done: "Answer grounded and complete",
};

export interface GlassBoxProps {
  open: boolean;
  question: string;
  raw: string;
  streaming: boolean;
  fallback: boolean;
  scene: SceneId;
  onClose: () => void;
}

// ---------------------------------------------------------------------------

export function GlassBox({
  open,
  question,
  raw,
  streaming,
  fallback,
  scene,
  onClose,
}: GlassBoxProps) {
  const [mounted, setMounted] = useState(false);
  const [desktop, setDesktop] = useState(false);
  const [reduced, setReduced] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    setMounted(true);
    setReduced(prefersReducedMotion());
    const mq = window.matchMedia("(min-width: 768px)");
    setDesktop(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setDesktop(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const {
    phase,
    notes,
    answerText,
    vaultDocs,
    pulseRef,
    retrievalRef,
    elapsedMs,
    tokenEstimate,
    scores,
    demo,
    k,
  } = useGlassBoxRun({ open, question, raw, streaming, fallback, scene });

  // ---- Scroll lock: lenis + html overflow, restored on close/unmount ----
  useEffect(() => {
    if (!open) return;
    const w = window as unknown as {
      lenis?: { stop: () => void; start: () => void };
    };
    w.lenis?.stop();
    const prevOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = prevOverflow;
      w.lenis?.start();
    };
  }, [open]);

  // ---- Escape (capture phase — must never reach the command center) ----
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, onClose]);

  // ---- Focus: close button on open, command input back on close ----
  useEffect(() => {
    if (open) {
      wasOpenRef.current = true;
      const t = setTimeout(() => closeRef.current?.focus(), 60);
      return () => clearTimeout(t);
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      document
        .querySelector<HTMLInputElement>(".command-field__input")
        ?.focus();
    }
  }, [open]);

  // ---- Derived view state ----
  const chips = useMemo(
    () => question.split(/\s+/).filter(Boolean).slice(0, 12),
    [question]
  );
  const tiles = useMemo(() => getScene(scene).slice(0, 4), [scene]);
  const showAnswer = PHASE_ORDER.indexOf(phase) >= COMPOSE_IDX;
  const notesStreaming = phase === "generate";
  const statusText =
    phase === "idle" ? "IDLE" : phase === "done" ? "GROUNDED ✓" : "RUNNING…";
  const singleColumn = !desktop || reduced;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="glassbox"
          className="glassbox"
          data-phase={phase}
          data-testid="glassbox"
          role="dialog"
          aria-modal="true"
          aria-label="DB-1 — watch the pipeline think"
          initial={reduced ? false : { opacity: 0, scale: 0.985 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduced ? undefined : { opacity: 0, scale: 0.99 }}
          transition={
            reduced
              ? { duration: 0 }
              : { duration: 0.5, ease: [0.16, 1, 0.3, 1] }
          }
        >
          {/* ---- Header ---- */}
          <div className="glassbox__header">
            <span className="glassbox__dot" aria-hidden />
            <span className="glassbox__brand">DB-1</span>
            <span className="label-mono glassbox__tagline">
              custom retrieval × routing × eval pipeline
            </span>
            <span className="glassbox__spacer" />
            <span
              className={cn(
                "glassbox__status",
                phase === "done" && "glassbox__status--done"
              )}
            >
              {statusText}
            </span>
            <button
              ref={closeRef}
              type="button"
              className="glassbox__close"
              onClick={onClose}
              aria-label="Close DB-1 overlay"
            >
              ×
            </button>
          </div>

          {/* Phase announcements for screen readers */}
          <div className="sr-only" role="status" aria-live="polite">
            {PHASE_ANNOUNCE[phase]}
          </div>

          {/* ---- Body ---- */}
          {singleColumn ? (
            <div className="glassbox__stack">
              {question && (
                <p className="glassbox__question-line">
                  <span aria-hidden>/ </span>
                  {question}
                </p>
              )}
              <PipelineTrace phase={phase} k={k} reduced={reduced} />
              <VaultPanel docs={vaultDocs} phase={phase} reduced={reduced} />
              <NotesPane notes={notes} streaming={notesStreaming} />
            </div>
          ) : (
            <div className="glassbox__grid">
              {/* Left rail */}
              <div className="glassbox__rail">
                <VaultPanel docs={vaultDocs} phase={phase} reduced={reduced} />
                <PipelineTrace phase={phase} k={k} reduced={reduced} />
              </div>

              {/* Center: token chips + neural field */}
              <div className="glassbox__center">
                <div className="glassbox__chips" aria-label={question}>
                  {chips.map((chip, i) => (
                    <motion.span
                      key={`${chip}-${i}`}
                      className="glassbox__chip"
                      aria-hidden
                      initial={reduced ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={
                        reduced
                          ? { duration: 0 }
                          : {
                              delay: 0.05 * i,
                              duration: 0.45,
                              ease: [0.16, 1, 0.3, 1],
                            }
                      }
                    >
                      {chip}
                    </motion.span>
                  ))}
                </div>
                <div className="glassbox__field">
                  {!reduced ? (
                    <NeuralField
                      pulseRef={pulseRef}
                      retrievalRef={retrievalRef}
                      phase={phase}
                      reduced={reduced}
                    />
                  ) : null}
                </div>
              </div>

              {/* Right: working notes */}
              <NotesPane notes={notes} streaming={notesStreaming} />
            </div>
          )}

          {/* ---- Answer band: text + materializing bento tiles ---- */}
          <AnimatePresence>
            {showAnswer && (
              <motion.div
                key="answer"
                className="glassbox__answer"
                initial={reduced ? false : { opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduced ? undefined : { opacity: 0 }}
                transition={
                  reduced
                    ? { duration: 0 }
                    : { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
                }
              >
                <div>
                  <span className="label-mono">answer</span>
                  <p className="glassbox__answer-text">{answerText}</p>
                </div>
                <div className="glassbox__tiles">
                  {tiles.map((tile, i) => (
                    <BentoTile
                      key={`glass-${scene}-${tile.id}`}
                      tile={tile}
                      index={i}
                      staticMode={reduced}
                    />
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ---- Footer: honesty line + real signals ---- */}
          <div className="glassbox__footer">
            <span className="label-mono glassbox__honesty">
              stylized visualization · real signals: tokens · sources ·
              timings
              {fallback ? " · demo trace, no API key" : ""}
            </span>
            <span className="glassbox__spacer" />
            <span className="glassbox__meta">
              ~{tokenEstimate} tok · {k} sources ·{" "}
              {(elapsedMs / 1000).toFixed(1)}s
            </span>
            {scores && (
              <span className="glassbox__scores">
                faithfulness {scores.faithfulness.toFixed(2)} ✓ relevancy{" "}
                {scores.relevancy.toFixed(2)} ✓{demo ? " (demo)" : ""}
              </span>
            )}
            <kbd className="kbd">esc</kbd>
          </div>

          <GlassBoxStyles />
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

// ---------------------------------------------------------------------------
// Working notes pane
// ---------------------------------------------------------------------------

function NotesPane({ notes, streaming }: { notes: string; streaming: boolean }) {
  return (
    <div className="glassbox__notes">
      <span className="label-mono">working notes</span>
      <div className="glassbox__notes-pane">
        {notes ? (
          <>
            {notes}
            {streaming && (
              <span className="glassbox__notes-cursor" aria-hidden />
            )}
          </>
        ) : (
          <span className="glassbox__notes-idle">
            {"// scratchpad — thinking streams here"}
            {streaming && (
              <span className="glassbox__notes-cursor" aria-hidden />
            )}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scoped styles — tokens only, hairlines, no fills, no glow.
// ---------------------------------------------------------------------------

function GlassBoxStyles() {
  return (
    <style>{`
      .glassbox {
        position: fixed;
        inset: 0;
        z-index: 140;
        display: flex;
        flex-direction: column;
        padding: clamp(16px, 3vw, 32px);
        background: rgba(6, 6, 8, 0.97);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        color: var(--text-primary);
        overflow-y: auto;
        overscroll-behavior: contain;
      }

      /* ---- Header ---- */
      .glassbox__header {
        display: flex;
        align-items: center;
        gap: 12px;
        padding-bottom: 14px;
        border-bottom: 1px solid var(--hairline);
        flex-shrink: 0;
      }
      .glassbox__dot {
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: var(--accent);
        flex-shrink: 0;
      }
      .glassbox__brand {
        font-family: var(--font-mono);
        font-size: 0.78rem;
        letter-spacing: 0.1em;
        color: var(--text-primary);
        border: 1px solid var(--hairline-strong);
        border-radius: 6px;
        padding: 2px 8px;
        flex-shrink: 0;
      }
      .glassbox__tagline {
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        min-width: 0;
      }
      .glassbox__spacer {
        flex: 1;
        min-width: 8px;
      }
      .glassbox__status {
        font-family: var(--font-mono);
        font-size: 0.66rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: var(--text-tertiary);
        white-space: nowrap;
      }
      .glassbox__status--done {
        color: var(--accent-teal);
      }
      .glassbox__close {
        width: 30px;
        height: 30px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        border: 1px solid var(--hairline-strong);
        background: transparent;
        color: var(--text-secondary);
        font-size: 1.05rem;
        line-height: 1;
        cursor: pointer;
        flex-shrink: 0;
        transition: color 0.25s var(--ease-hover),
          border-color 0.25s var(--ease-hover);
      }
      .glassbox__close:hover {
        color: var(--text-primary);
        border-color: var(--text-tertiary);
      }

      /* ---- Desktop grid ---- */
      .glassbox__grid {
        flex: 1;
        min-height: 0;
        display: grid;
        grid-template-columns: 260px minmax(0, 1fr) 300px;
        gap: 24px;
        padding-top: 20px;
      }
      .glassbox__rail {
        display: flex;
        flex-direction: column;
        gap: 26px;
        min-width: 0;
        overflow-y: auto;
      }
      .glassbox__center {
        display: flex;
        flex-direction: column;
        min-width: 0;
        min-height: 0;
      }
      .glassbox__chips {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        justify-content: center;
        padding-bottom: 12px;
      }
      .glassbox__chip {
        font-family: var(--font-mono);
        font-size: 0.7rem;
        color: var(--text-secondary);
        border: 1px solid var(--hairline);
        border-radius: 6px;
        padding: 2px 7px;
        background: var(--bg-surface);
      }
      .glassbox__field {
        flex: 1;
        min-height: 200px;
        position: relative;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-lg);
        overflow: hidden;
      }

      /* ---- Notes pane ---- */
      .glassbox__notes {
        display: flex;
        flex-direction: column;
        gap: 10px;
        min-width: 0;
        min-height: 0;
      }
      .glassbox__notes-pane {
        flex: 1;
        min-height: 120px;
        overflow-y: auto;
        font-family: var(--font-mono);
        font-size: 0.72rem;
        line-height: 1.7;
        color: #6b6b74;
        white-space: pre-wrap;
        word-break: break-word;
        border: 1px solid var(--hairline);
        border-radius: var(--radius-md);
        padding: 12px 14px;
        background: var(--bg-surface);
      }
      .glassbox__notes-idle {
        color: var(--text-faint);
      }
      .glassbox__notes-cursor {
        display: inline-block;
        width: 6px;
        height: 12px;
        margin-left: 3px;
        vertical-align: baseline;
        background: var(--accent);
        animation: glassbox-blink 1s step-end infinite;
      }
      @keyframes glassbox-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }

      /* ---- Mobile / reduced-motion stack ---- */
      .glassbox__stack {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 24px;
        padding-top: 20px;
      }
      .glassbox__question-line {
        font-family: var(--font-mono);
        font-size: 0.8rem;
        line-height: 1.5;
        color: var(--text-secondary);
      }

      /* ---- Answer band ---- */
      .glassbox__answer {
        flex-shrink: 0;
        display: grid;
        grid-template-columns: minmax(0, 65ch) minmax(0, 1fr);
        gap: 24px;
        align-items: start;
        margin-top: 20px;
        padding-top: 18px;
        border-top: 1px solid var(--hairline);
      }
      .glassbox__answer-text {
        margin-top: 10px;
        max-width: 65ch;
        font-size: 0.95rem;
        line-height: 1.65;
        color: var(--text-primary);
      }
      .glassbox__tiles {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }
      @media (max-width: 1023px) {
        .glassbox__answer {
          grid-template-columns: 1fr;
        }
      }
      @media (max-width: 519px) {
        .glassbox__tiles {
          grid-template-columns: 1fr;
        }
      }

      /* ---- Footer ---- */
      .glassbox__footer {
        flex-shrink: 0;
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 10px 18px;
        margin-top: 18px;
        padding-top: 14px;
        border-top: 1px solid var(--hairline);
      }
      .glassbox__honesty {
        letter-spacing: 0.12em;
      }
      .glassbox__meta {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        color: var(--text-tertiary);
        white-space: nowrap;
      }
      .glassbox__scores {
        font-family: var(--font-mono);
        font-size: 0.68rem;
        letter-spacing: 0.04em;
        color: var(--accent-teal);
        white-space: nowrap;
      }
    `}</style>
  );
}
