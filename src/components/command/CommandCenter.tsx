"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, isMobile } from "@/lib/animations/gsap-config";
import { extractSceneTags, stripSceneTags } from "@/lib/ai/scene-detector";
import { splitNotes } from "@/lib/ai/notes-parser";
import { GlassBox } from "@/components/glassbox/GlassBox";
import { BentoTile } from "./BentoTile";
import { useCommandKeys } from "./useCommandKeys";
import {
  getScene,
  matchScene,
  cannedAnswers,
  sceneLabels,
  isSceneId,
  type SceneId,
  type BentoTileData,
} from "./bento-scenes";

// ---------------------------------------------------------------------------
// Desktop bento layout — 8 cells surrounding the centered "chat" cell.
//   a b c
//   d chat e
//   f g h
// ---------------------------------------------------------------------------

const AREAS = ["a", "b", "c", "d", "e", "f", "g", "h"] as const;

const SUGGESTIONS: { label: string; scene: SceneId }[] = [
  { label: "/ genie", scene: "genie" },
  { label: "/ impact", scene: "impact" },
  { label: "/ stack", scene: "stack" },
  { label: "/ who", scene: "story" },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMessageText(msg: {
  parts?: Array<{ type: string; text?: string }>;
  content?: string;
}): string {
  if (msg.parts && msg.parts.length > 0) {
    return msg.parts
      .filter(
        (p): p is { type: "text"; text: string } =>
          p.type === "text" && typeof p.text === "string"
      )
      .map((p) => p.text)
      .join("");
  }
  if (typeof msg.content === "string") return msg.content;
  return "";
}

/** Pick a scene from a streamed/canned answer: prefer an explicit scene tag,
 *  fall back to keyword-matching the question text. */
function classify(question: string, answerWithTags: string): SceneId {
  const tags = extractSceneTags(answerWithTags);
  for (const t of tags) {
    if (isSceneId(t.sceneId)) return t.sceneId;
  }
  return matchScene(question);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CommandCenter() {
  const sectionRef = useRef<HTMLElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const cancelFallbackRef = useRef<(() => void) | null>(null);

  const [reduced, setReduced] = useState(false);
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    setReduced(prefersReducedMotion());
    setMobile(isMobile());
    const onResize = () => setMobile(isMobile());
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  // ---- Scene + answer state ----
  const [scene, setSceneState] = useState<SceneId>("default");
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState(""); // cleaned, visible answer line
  const [lastQuestion, setLastQuestion] = useState("");

  // ---- Fallback (no-API) mode ----
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackStreaming, setFallbackStreaming] = useState(false);

  // ---- DB-1 glass-box overlay (opens on typed/submitted questions) ----
  const [osOpen, setOsOpen] = useState(false);

  // ---- Live AI SDK chat ----
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: "command-center",
    transport: { api: "/api/chat" } as Parameters<
      typeof useChat
    >[0] extends { transport?: infer T }
      ? T
      : never,
    onError: () => {
      // Any failure (503 no-key, network, rate limit): switch to local mode.
      setUseFallback(true);
    },
  });

  useEffect(() => {
    if (error && !useFallback) {
      setUseFallback(true);
    }
  }, [error, useFallback]);

  const liveStreaming = status === "streaming" || status === "submitted";
  const isStreaming = useFallback ? fallbackStreaming : liveStreaming;

  // ---- Derive the latest assistant message (live mode) ----
  const latestAssistantRaw = useMemo(() => {
    if (useFallback) return "";
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === "assistant") return getMessageText(messages[i]);
    }
    return "";
  }, [messages, useFallback]);

  // ---- Live mode: reflect streamed answer + switch scene ----
  // splitNotes strips the [NOTES]…[/NOTES] scratchpad so the model's working
  // notes never leak into the inline answer (they render in the glass box).
  useEffect(() => {
    if (useFallback || !latestAssistantRaw) return;
    setAnswer(stripSceneTags(splitNotes(latestAssistantRaw).answer));
  }, [latestAssistantRaw, useFallback]);

  // When a live answer finishes streaming, classify the scene.
  useEffect(() => {
    if (useFallback) return;
    if (status === "ready" && latestAssistantRaw && lastQuestion) {
      setSceneState(classify(lastQuestion, latestAssistantRaw));
    }
  }, [status, latestAssistantRaw, lastQuestion, useFallback]);

  // ---- Scene change announcer ----
  const setScene = useCallback((next: SceneId) => {
    setSceneState(next);
  }, []);

  const reset = useCallback(() => {
    cancelFallbackRef.current?.();
    cancelFallbackRef.current = null;
    setFallbackStreaming(false);
    setSceneState("default");
    setAnswer("");
    setInput("");
    setLastQuestion("");
  }, []);

  // ---- Fallback streaming (local, no network) ----
  // Time-based (not per-tick) progression so browser timer throttling in
  // hidden/backgrounded tabs can't stall the stream — late ticks catch up.
  const streamFallback = useCallback((text: string) => {
    setFallbackStreaming(true);
    setAnswer("");
    const start = performance.now();
    const cps = 48; // characters per second
    let cancelled = false;

    const tick = () => {
      if (cancelled) return;
      const shown = Math.min(
        text.length,
        Math.floor(((performance.now() - start) / 1000) * cps)
      );
      setAnswer(text.slice(0, shown));
      if (shown < text.length) {
        setTimeout(tick, 28);
      } else {
        setFallbackStreaming(false);
        cancelFallbackRef.current = null;
      }
    };
    setTimeout(tick, 120);
    cancelFallbackRef.current = () => {
      cancelled = true;
    };
  }, []);

  // ---- Replay a stranded question locally after a live-mode failure ----
  // If the stream errored mid-question (e.g. first ask with no API key), the
  // flip to fallback alone would leave the glass box stalled on a dead stream.
  // Re-run the pending question through the local path.
  useEffect(() => {
    if (!useFallback || !lastQuestion) return;
    if (fallbackStreaming || answer) return;
    const s = matchScene(lastQuestion);
    setSceneState(s);
    streamFallback(cannedAnswers[s]);
  }, [useFallback, lastQuestion, fallbackStreaming, answer, streamFallback]);

  // ---- Submit a query ----
  const runQuery = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q || isStreaming) return;
      setLastQuestion(q);
      setInput("");

      if (useFallback) {
        const s = matchScene(q);
        setSceneState(s);
        streamFallback(cannedAnswers[s]);
      } else {
        setAnswer("");
        // Provisionally switch scene from the question so the bento reacts
        // immediately; the scene-tag classifier refines it once streamed.
        const provisional = matchScene(q);
        if (provisional !== "default") setSceneState(provisional);
        sendMessage({ text: q });
      }

      // Typed/submitted questions take over the screen — DB-1 OS mode.
      setOsOpen(true);
    },
    [isStreaming, useFallback, streamFallback, sendMessage]
  );

  const submit = useCallback(() => {
    runQuery(input);
  }, [runQuery, input]);

  const onFormSubmit = useCallback(
    (e: FormEvent) => {
      e.preventDefault();
      submit();
    },
    [submit]
  );

  // ---- Keyboard exploration ----
  const { showShortcuts, setShowShortcuts, eggActive } = useCommandKeys({
    inputRef,
    setScene,
    reset,
    submit,
  });

  // ---- Smooth-scroll + focus on ⌘K / Ctrl+K and the global event ----
  const focusSelf = useCallback(() => {
    const el = sectionRef.current;
    if (el) {
      const lenis = (window as unknown as { lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).lenis;
      if (lenis && !reduced) lenis.scrollTo(el, { offset: -40 });
      else
        el.scrollIntoView({
          behavior: reduced ? "auto" : "smooth",
          block: "center",
        });
    }
    setTimeout(() => inputRef.current?.focus(), reduced ? 0 : 400);
  }, [reduced]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        focusSelf();
      }
    };
    const onOpen = () => focusSelf();
    window.addEventListener("keydown", onKey);
    window.addEventListener("dhruv:open-command", onOpen as EventListener);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("dhruv:open-command", onOpen as EventListener);
    };
  }, [focusSelf]);

  // ---- Current tiles ----
  const tiles = getScene(scene);
  const staticMode = reduced;

  // Project tiles drill into their scene on click.
  const onTileActivate = useCallback(
    (tile: BentoTileData) => {
      if (tile.type === "project" && tile.sceneId && isSceneId(tile.sceneId)) {
        setScene(tile.sceneId);
      }
    },
    [setScene]
  );

  const showCaret = !isStreaming && answer.length === 0;

  return (
    <section
      id="command"
      ref={sectionRef}
      className="section relative"
      aria-label="Ask Dhruv — command center"
    >
      {/* Eyebrow */}
      <div className="mb-8 flex items-center justify-between gap-4">
        <span className="label-mono">{"// ask anything"}</span>
        <span className="label-mono hidden sm:inline">
          {useFallback ? "DB-1 · offline demo" : "DB-1 · live"}
        </span>
      </div>

      {/* Live region for scene-change announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {sceneLabels[scene]}
      </div>

      {/* ============================ DESKTOP BENTO ============================ */}
      <div
        className={cn(
          "command-bento",
          mobile ? "command-bento--mobile" : "command-bento--desktop"
        )}
      >
        {/* Surrounding tiles */}
        <AnimatePresence mode="popLayout" initial={false}>
          {tiles.slice(0, 8).map((tile, i) => (
            <BentoTile
              key={`${scene}-${tile.id}`}
              tile={tile}
              index={i}
              staticMode={staticMode}
              area={mobile ? undefined : AREAS[i]}
              onActivate={onTileActivate}
            />
          ))}
        </AnimatePresence>

        {/* Centered command cell */}
        <div
          className={cn(
            "command-bento__chat flex flex-col justify-center",
            !mobile && "px-2"
          )}
          style={mobile ? undefined : { gridArea: "chat" }}
        >
          <form onSubmit={onFormSubmit} className="w-full">
            <div className="command-field group">
              <span aria-hidden className="command-field__prompt">
                /
              </span>
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="what do you want to know?"
                className="command-field__input"
                aria-label="Ask Dhruv a question"
                disabled={isStreaming}
                spellCheck={false}
                autoComplete="off"
              />
              {showCaret && (
                <span aria-hidden className="command-field__caret caret-blink" />
              )}
              <span aria-hidden className="command-field__enter kbd">
                ↵
              </span>
            </div>
          </form>

          {/* Answer line (typewriter) OR suggestions */}
          <div className="command-answer">
            <AnimatePresence mode="wait">
              {answer || isStreaming ? (
                <motion.p
                  key="answer"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="command-answer__text"
                >
                  {answer}
                  {isStreaming && (
                    <span className="command-answer__cursor" aria-hidden />
                  )}
                </motion.p>
              ) : (
                <motion.div
                  key="suggestions"
                  initial={reduced ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={reduced ? undefined : { opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="command-suggestions"
                >
                  {SUGGESTIONS.map((s) => (
                    <button
                      key={s.scene}
                      type="button"
                      className="link-grow font-mono text-[0.8rem]"
                      onClick={() => setScene(s.scene)}
                    >
                      {s.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ============================ FOOTER HINTS ============================ */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[var(--text-tertiary)]">
        <HintRow keys={["/"]} label="focus" />
        <HintRow keys={["1", "4"]} label="projects" sep="–" />
        <HintRow keys={["?"]} label="keys" />
        <HintRow keys={["esc"]} label="reset" />
        {scene !== "default" && (
          <button
            type="button"
            onClick={reset}
            className="link-grow font-mono text-[0.7rem] uppercase tracking-[0.14em]"
          >
            ← overview
          </button>
        )}
      </div>

      {/* ============================ SHORTCUTS OVERLAY ============================ */}
      <AnimatePresence>
        {showShortcuts && (
          <motion.div
            className="command-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setShowShortcuts(false)}
            role="dialog"
            aria-modal="true"
            aria-label="Keyboard shortcuts"
          >
            <motion.div
              className="command-overlay__panel"
              initial={reduced ? false : { opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={reduced ? undefined : { opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-5 flex items-center justify-between">
                <span className="label-mono">{"// keyboard"}</span>
                <span className="label-mono">esc to close</span>
              </div>
              <ul className="space-y-3">
                <ShortcutLine keys={["/"]} desc="Focus the command field" />
                <ShortcutLine keys={["1", "2", "3", "4"]} desc="Jump to GENIE · A-IEP · VCT Scout · One-L" />
                <ShortcutLine keys={["↵"]} desc="Ask the question" />
                <ShortcutLine keys={["?"]} desc="Toggle this panel" />
                <ShortcutLine keys={["esc"]} desc="Reset to overview" />
                <ShortcutLine keys={["⌘", "K"]} desc="Jump here from anywhere" />
              </ul>
              <p className="mt-6 font-mono text-[0.66rem] leading-relaxed text-[var(--text-faint)]">
                psst — there&apos;s a classic cheat code in here somewhere.
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ============================ EASTER EGG ============================ */}
      <AnimatePresence>
        {eggActive && !reduced && (
          <>
            <Confetti />
            <motion.div
              className="command-egg-toast"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              role="status"
            >
              <span className="command-egg-toast__dot" aria-hidden />
              <span className="font-mono text-[0.8rem]">
                gg. now go grab some pani puri 🫧
              </span>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ============================ DB-1 GLASS BOX ============================ */}
      <GlassBox
        open={osOpen}
        question={lastQuestion}
        raw={useFallback ? answer : latestAssistantRaw}
        streaming={isStreaming}
        fallback={useFallback}
        scene={scene}
        onClose={() => setOsOpen(false)}
      />

      <CommandCenterStyles />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Small presentational helpers
// ---------------------------------------------------------------------------

function HintRow({
  keys,
  label,
  sep,
}: {
  keys: string[];
  label: string;
  sep?: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((k, i) => (
        <span key={k} className="flex items-center gap-1.5">
          <kbd className="kbd">{k}</kbd>
          {sep && i < keys.length - 1 && (
            <span className="text-[var(--text-faint)]">{sep}</span>
          )}
        </span>
      ))}
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.14em]">
        {label}
      </span>
    </span>
  );
}

function ShortcutLine({ keys, desc }: { keys: string[]; desc: string }) {
  return (
    <li className="flex items-center justify-between gap-4">
      <span className="flex items-center gap-1.5">
        {keys.map((k) => (
          <kbd key={k} className="kbd">
            {k}
          </kbd>
        ))}
      </span>
      <span className="text-right text-[0.82rem] text-[var(--text-secondary)]">
        {desc}
      </span>
    </li>
  );
}

// ---------------------------------------------------------------------------
// Confetti — a brief terracotta-forward burst, CSS-driven, no deps.
// ---------------------------------------------------------------------------

function Confetti() {
  const pieces = useMemo(() => {
    const colors = [
      "var(--accent)",
      "var(--accent-light)",
      "var(--accent-purple)",
      "var(--accent-teal)",
    ];
    return Array.from({ length: 56 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 1.6 + Math.random() * 1,
      drift: (Math.random() - 0.5) * 160,
      color: colors[i % colors.length],
      size: 5 + Math.random() * 5,
      rotate: Math.random() * 360,
    }));
  }, []);

  return (
    <div className="command-confetti" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className="command-confetti__piece"
          style={
            {
              left: `${p.left}%`,
              background: p.color,
              width: `${p.size}px`,
              height: `${p.size * 0.5}px`,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
              "--drift": `${p.drift}px`,
              "--rot": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scoped styles — layout that's awkward in pure Tailwind (grid-template-areas,
// the command field, confetti keyframes). Colors all reference globals tokens.
// ---------------------------------------------------------------------------

function CommandCenterStyles() {
  return (
    <style>{`
      .command-bento--desktop {
        display: grid;
        grid-template-columns: 1fr 1.5fr 1fr;
        grid-template-rows: auto auto auto;
        grid-template-areas:
          "a b c"
          "d chat e"
          "f g h";
        gap: 14px;
        align-items: stretch;
      }
      .command-bento--desktop .command-bento__chat {
        min-height: 200px;
      }
      .command-bento--mobile {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .command-bento--mobile .command-bento__chat {
        order: -1;
      }
      .command-bento--mobile > div:not(.command-bento__chat) {
        /* tiles laid out in a 2-col grid under the field */
      }
      @media (max-width: 767px) {
        .command-bento--mobile {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
        }
        .command-bento--mobile .command-bento__chat {
          grid-column: 1 / -1;
        }
      }

      /* ---- Command field ---- */
      .command-field {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px 18px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--hairline-strong);
        background: var(--bg-surface);
        transition: border-color 0.35s var(--ease-out-expo),
          box-shadow 0.35s var(--ease-out-expo);
      }
      .command-field:focus-within {
        border-color: var(--accent);
        box-shadow: 0 0 0 1px var(--accent-glow);
      }
      .command-field__prompt {
        font-family: var(--font-mono);
        font-size: 1rem;
        color: var(--accent);
        line-height: 1;
      }
      .command-field__input {
        flex: 1;
        background: transparent;
        border: none;
        outline: none;
        color: var(--text-primary);
        font-size: 1.05rem;
        font-weight: 450;
        letter-spacing: -0.01em;
        min-width: 0;
      }
      .command-field__input::placeholder {
        color: var(--text-tertiary);
        font-family: var(--font-mono);
        font-size: 0.92rem;
        letter-spacing: 0;
      }
      .command-field__input:disabled {
        opacity: 0.6;
      }
      .command-field__caret {
        width: 2px;
        height: 1.1rem;
        background: var(--accent);
        margin-left: -8px;
      }
      .command-field__enter {
        flex-shrink: 0;
      }

      /* ---- Answer / suggestions ---- */
      .command-answer {
        margin-top: 14px;
        min-height: 44px;
      }
      .command-answer__text {
        font-size: 0.92rem;
        line-height: 1.6;
        color: var(--text-secondary);
      }
      .command-answer__cursor {
        display: inline-block;
        width: 7px;
        height: 14px;
        margin-left: 3px;
        vertical-align: text-bottom;
        background: var(--accent-light);
        animation: command-blink 1s step-end infinite;
      }
      @keyframes command-blink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0; }
      }
      .command-suggestions {
        display: flex;
        flex-wrap: wrap;
        gap: 18px;
      }

      /* ---- Shortcuts overlay ---- */
      .command-overlay {
        position: fixed;
        inset: 0;
        z-index: 120;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
        background: rgba(5, 5, 7, 0.72);
        backdrop-filter: blur(10px);
        -webkit-backdrop-filter: blur(10px);
      }
      .command-overlay__panel {
        width: 100%;
        max-width: 460px;
        padding: 26px 28px;
        border-radius: var(--radius-lg);
        border: 1px solid var(--hairline-strong);
        background: var(--bg-surface);
      }

      /* ---- Easter egg ---- */
      .command-confetti {
        position: fixed;
        inset: 0;
        z-index: 130;
        pointer-events: none;
        overflow: hidden;
      }
      .command-confetti__piece {
        position: absolute;
        top: -16px;
        border-radius: 1px;
        animation-name: command-confetti-fall;
        animation-timing-function: cubic-bezier(0.4, 0.1, 0.6, 1);
        animation-fill-mode: forwards;
      }
      @keyframes command-confetti-fall {
        0% {
          opacity: 1;
          transform: translate(0, 0) rotate(var(--rot));
        }
        100% {
          opacity: 0;
          transform: translate(var(--drift), 105vh) rotate(calc(var(--rot) + 540deg));
        }
      }
      .command-egg-toast {
        position: fixed;
        left: 50%;
        bottom: 36px;
        z-index: 131;
        transform: translateX(-50%);
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 12px 18px;
        border-radius: var(--radius-md);
        border: 1px solid var(--hairline-strong);
        background: var(--bg-elevated);
        color: var(--text-primary);
      }
      .command-egg-toast__dot {
        width: 8px;
        height: 8px;
        border-radius: 9999px;
        background: var(--accent);
      }
    `}</style>
  );
}
