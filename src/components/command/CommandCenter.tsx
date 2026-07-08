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
import { DefaultChatTransport } from "ai";
import { cn } from "@/lib/utils";
import { prefersReducedMotion, isMobile } from "@/lib/animations/gsap-config";
import { extractSceneTags, stripSceneTags } from "@/lib/ai/scene-detector";
import { splitNotes } from "@/lib/ai/notes-parser";
import { GlassBox } from "@/components/glassbox/GlassBox";
import { getCannedNotes } from "@/components/glassbox/vault-docs";
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

// Module-level: one transport for the component's lifetime.
const chatTransport = new DefaultChatTransport({ api: "/api/chat" });

const SUGGESTIONS: { label: string; scene: SceneId }[] = [
  { label: "/ genie", scene: "genie" },
  { label: "/ impact", scene: "impact" },
  { label: "/ stack", scene: "stack" },
  { label: "/ who", scene: "story" },
];

// ---------------------------------------------------------------------------
// Inline run phases — the in-bento progress readout. No takeover: the bento
// dims, the center cell narrates, and the answer lands where you asked.
//   route     first beat after submit (question → scene routing)
//   retrieve  until the first streamed content (or the local doc pull)
//   generate  working notes / answer streaming
//   done      run settled — tiles un-dim, the answer stays put
// ---------------------------------------------------------------------------

const RUN_STEPS = ["route", "retrieve", "generate", "done"] as const;
type RunStep = (typeof RUN_STEPS)[number];
type RunPhase = "idle" | RunStep;

const ROUTE_MS = 400; // fixed "route" beat after submit
const FALLBACK_RETRIEVE_MS = 500; // offline: brief retrieve beat
const FALLBACK_NOTES_CPS = 72; // offline notes stream rate (chars/second)
const FALLBACK_ANSWER_DELAY_MS = 250; // beat between notes end and answer
const DEAD_RUN_BAIL_MS = 1200; // live stream settled empty → go local

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

  // ---- DB-1 glass-box overlay (opt-in "view full trace", never automatic) ----
  const [osOpen, setOsOpen] = useState(false);
  /** Raw text handed to the GlassBox — blanked on open so its stale-answer
   *  baseline snapshots empty, then re-fed by the mirror effect below. */
  const [glassRaw, setGlassRaw] = useState("");

  // ---- Inline run state (the bento IS the progress UI) ----
  const [runPhase, setRunPhase] = useState<RunPhase>("idle");
  const [inlineNotes, setInlineNotes] = useState(""); // offline working notes
  const [hasRun, setHasRun] = useState(false); // a run started → trace exists
  /** Scene matched from the last question — drives offline notes/answers. */
  const runSceneRef = useRef<SceneId>("default");
  /** latestAssistantRaw snapshot at submit — anything equal to it is stale. */
  const liveBaselineRef = useRef("");

  const runActive =
    runPhase === "route" || runPhase === "retrieve" || runPhase === "generate";

  // ---- Live AI SDK chat ----
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    id: "command-center",
    // A real transport — the previous `{ api } as …` cast satisfied the types
    // but wasn't a functioning transport, so sendMessage never hit the network.
    transport: chatTransport,
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

  const latestRawRef = useRef("");
  useEffect(() => {
    latestRawRef.current = latestAssistantRaw;
  }, [latestAssistantRaw]);

  // True once THIS run's stream has produced content (not a stale answer).
  const liveFresh =
    !useFallback &&
    latestAssistantRaw.length > 0 &&
    latestAssistantRaw !== liveBaselineRef.current;

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
    setRunPhase("idle");
    setInlineNotes("");
    setHasRun(false);
    setSceneState("default");
    setAnswer("");
    setInput("");
    setLastQuestion("");
  }, []);

  // ---- Fallback streaming (local, no network) ----
  // Time-based (not per-tick) progression so browser timer throttling in
  // hidden/backgrounded tabs can't stall the stream — late ticks catch up.
  const streamFallback = useCallback((text: string, onDone?: () => void) => {
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
        onDone?.();
      }
    };
    setTimeout(tick, 120);
    cancelFallbackRef.current = () => {
      cancelled = true;
    };
  }, []);

  // ---- Re-aim a stranded run locally after a live-mode failure ----
  // If the stream errored before producing an answer (e.g. first ask with no
  // API key), the flip to fallback alone would strand the inline run. Point
  // the run at the local path — the phase effects below carry it to "done".
  useEffect(() => {
    if (!useFallback || !lastQuestion || !runActive) return;
    if (fallbackStreaming || answer) return;
    const s = matchScene(lastQuestion);
    runSceneRef.current = s;
    setSceneState(s);
  }, [useFallback, lastQuestion, runActive, fallbackStreaming, answer]);

  // =========================================================================
  // Inline run phase machine — route → retrieve → generate → done.
  // =========================================================================

  // route: a fixed first beat after submit.
  useEffect(() => {
    if (runPhase !== "route") return;
    const id = setTimeout(() => setRunPhase("retrieve"), ROUTE_MS);
    return () => clearTimeout(id);
  }, [runPhase]);

  // retrieve → generate (live): the first streamed content of this run.
  useEffect(() => {
    if (useFallback || runPhase !== "retrieve") return;
    if (liveFresh) setRunPhase("generate");
  }, [useFallback, runPhase, liveFresh]);

  // retrieve → generate (offline): a brief beat — nothing to actually fetch.
  useEffect(() => {
    if (!useFallback || runPhase !== "retrieve") return;
    const id = setTimeout(() => setRunPhase("generate"), FALLBACK_RETRIEVE_MS);
    return () => clearTimeout(id);
  }, [useFallback, runPhase]);

  // generate → done (live): the stream has settled.
  useEffect(() => {
    if (useFallback || runPhase !== "generate") return;
    if (status === "ready") setRunPhase("done");
  }, [useFallback, runPhase, status]);

  // Live guard: stream settled with no content (and no error-driven flip) —
  // bail to the local path instead of thinking forever.
  useEffect(() => {
    if (useFallback) return;
    if (runPhase !== "route" && runPhase !== "retrieve") return;
    if (status !== "ready" && status !== "error") return;
    const id = setTimeout(() => setUseFallback(true), DEAD_RUN_BAIL_MS);
    return () => clearTimeout(id);
  }, [useFallback, runPhase, status]);

  // generate (offline): stream the canned working notes inline — chars derive
  // from elapsed time so hidden-tab timer throttling can't stall the stream —
  // then hand off to the canned answer.
  useEffect(() => {
    if (!useFallback || runPhase !== "generate") return;
    const s = runSceneRef.current;
    const text = getCannedNotes(s);
    const start = performance.now();
    let answerTimer: ReturnType<typeof setTimeout> | null = null;
    let handedOff = false;
    const iv = setInterval(() => {
      const shown = Math.min(
        text.length,
        Math.floor(((performance.now() - start) / 1000) * FALLBACK_NOTES_CPS)
      );
      setInlineNotes(text.slice(0, shown));
      if (shown >= text.length && !handedOff) {
        handedOff = true;
        clearInterval(iv);
        answerTimer = setTimeout(() => {
          streamFallback(cannedAnswers[s], () => setRunPhase("done"));
        }, FALLBACK_ANSWER_DELAY_MS);
      }
    }, 24);
    return () => {
      clearInterval(iv);
      if (answerTimer) clearTimeout(answerTimer);
    };
  }, [useFallback, runPhase, streamFallback]);

  // ---- Submit a query ----
  const runQuery = useCallback(
    (raw: string) => {
      const q = raw.trim();
      if (!q || isStreaming || runActive) return;
      setLastQuestion(q);
      setInput("");
      setAnswer("");
      setInlineNotes("");
      setHasRun(true);

      const matched = matchScene(q);
      runSceneRef.current = matched;

      if (useFallback) {
        setSceneState(matched);
      } else {
        // Provisionally switch scene from the question so the bento reacts
        // immediately; the scene-tag classifier refines it once streamed.
        if (matched !== "default") setSceneState(matched);
        liveBaselineRef.current = latestRawRef.current;
        sendMessage({ text: q });
      }

      // No takeover — the bento itself is the progress state.
      setRunPhase("route");
    },
    [isStreaming, runActive, useFallback, sendMessage]
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
  const { eggActive } = useCommandKeys({
    inputRef,
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

  // ---- Opt-in full trace: open the GlassBox for the current run ----
  // glassRaw is blanked first so useGlassBoxRun snapshots an empty baseline on
  // open; the mirror effect then feeds it the real text (child effects run
  // before parent effects), so the overlay replays sensibly even after the
  // run has completed.
  const openTrace = useCallback(() => {
    setGlassRaw("");
    setOsOpen(true);
  }, []);

  const rawForGlass = useFallback ? answer : latestAssistantRaw;
  useEffect(() => {
    if (!osOpen) return;
    setGlassRaw(rawForGlass);
  }, [osOpen, rawForGlass]);

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

  // ---- Inline thinking readout ----
  // Working notes: the model's scratchpad (live) or the canned notes (offline),
  // shown only until the answer starts streaming into the same spot.
  const runNotes = useMemo(() => {
    if (useFallback) return inlineNotes;
    if (!liveFresh) return "";
    return splitNotes(latestAssistantRaw).notes;
  }, [useFallback, inlineNotes, liveFresh, latestAssistantRaw]);

  const showInlineNotes =
    runActive && answer.length === 0 && runNotes.trim().length > 0;

  const noteLines = useMemo(() => {
    if (!showInlineNotes) return [];
    return runNotes
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(-4);
  }, [showInlineNotes, runNotes]);

  const showCaret = !runActive && !isStreaming && answer.length === 0;

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
        <span
          className="label-mono hidden sm:inline"
          title={
            useFallback
              ? "DB-1 — my custom retrieval × routing × eval pipeline. Offline right now: answers come from a scripted demo."
              : "DB-1 — my custom retrieval × routing × eval pipeline"
          }
        >
          {useFallback ? "DB-1 · offline demo" : "DB-1 · live"}
        </span>
      </div>

      {/* Live region for run + scene-change announcements */}
      <div className="sr-only" role="status" aria-live="polite">
        {runActive ? "Working on your answer" : sceneLabels[scene]}
      </div>

      {/* ============================ DESKTOP BENTO ============================ */}
      <div
        className={cn(
          "command-bento",
          mobile ? "command-bento--mobile" : "command-bento--desktop",
          runActive && "command-bento--thinking"
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
                disabled={isStreaming || runActive}
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

          {/* Progress readout (in-run) OR answer line OR suggestions */}
          <div className="command-answer">
            <AnimatePresence mode="wait">
              {runActive ? (
                <motion.div
                  key="thinking"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                  className="command-thinking"
                >
                  <InlineTrace phase={runPhase} />
                  <AnimatePresence mode="wait" initial={false}>
                    {showInlineNotes ? (
                      <motion.div
                        key="notes"
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduced ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="command-thinking__notes"
                        aria-hidden
                      >
                        {noteLines.map((line, i) => (
                          <span
                            key={i}
                            className="command-thinking__note"
                            style={{
                              opacity:
                                0.35 + (0.65 * (i + 1)) / noteLines.length,
                            }}
                          >
                            {line}
                          </span>
                        ))}
                      </motion.div>
                    ) : (
                      <motion.p
                        key="stream"
                        initial={reduced ? false : { opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={reduced ? undefined : { opacity: 0 }}
                        transition={{ duration: 0.18 }}
                        className="command-answer__text"
                      >
                        {answer}
                        <span
                          className="command-answer__cursor"
                          aria-hidden
                        />
                      </motion.p>
                    )}
                  </AnimatePresence>
                </motion.div>
              ) : answer ? (
                <motion.p
                  key="answer"
                  initial={reduced ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduced ? undefined : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                  className="command-answer__text"
                >
                  {answer}
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
      {/* Deliberately minimal — only the keys people reach for by instinct. */}
      <div className="mt-10 flex flex-wrap items-center justify-center gap-x-5 gap-y-3 text-[var(--text-tertiary)]">
        <HintRow keys={["/"]} label="focus" />
        <HintRow keys={["↵"]} label="ask" />
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
        {hasRun && (
          <button
            type="button"
            onClick={openTrace}
            className="link-grow font-mono text-[0.7rem] uppercase tracking-[0.14em]"
            title="Open the full DB-1 pipeline view for this run"
          >
            view full trace ↗
          </button>
        )}
      </div>

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

      {/* ============================ DB-1 GLASS BOX (opt-in trace) ============================ */}
      <GlassBox
        open={osOpen}
        question={lastQuestion}
        raw={glassRaw}
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
// InlineTrace — the compact in-bento pipeline readout. Same visual language
// as the GlassBox PipelineTrace (pending faint, active terracotta, done teal),
// sized for the center cell: four mono steps on one line.
// ---------------------------------------------------------------------------

function InlineTrace({ phase }: { phase: RunPhase }) {
  const cur = (RUN_STEPS as readonly string[]).indexOf(phase); // -1 while idle
  return (
    <div className="command-trace" aria-label="Answer pipeline">
      {RUN_STEPS.map((step, i) => {
        const status: "pending" | "active" | "done" =
          phase === "done"
            ? "done"
            : i < cur
              ? "done"
              : i === cur
                ? "active"
                : "pending";
        return (
          <span
            key={step}
            className={cn(
              "command-trace__step",
              `command-trace__step--${status}`
            )}
          >
            <span className="command-trace__dot" aria-hidden />
            {step}
          </span>
        );
      })}
    </div>
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
        min-height: 176px;
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

      /* ---- In-bento thinking state ---- */
      .command-bento .tile {
        transition: border-color 0.35s var(--ease-hover),
          background-color 0.35s var(--ease-hover),
          opacity 0.6s var(--ease-out-expo);
      }
      .command-bento--thinking .tile {
        opacity: 0.35;
        animation: command-thinking-pulse 3.2s ease-in-out infinite;
      }
      @keyframes command-thinking-pulse {
        0%, 100% { opacity: 0.35; }
        50% { opacity: 0.48; }
      }

      .command-thinking {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      /* Compact pipeline trace — route → retrieve → generate → done */
      .command-trace {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: 6px 16px;
      }
      .command-trace__step {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        font-family: var(--font-mono);
        font-size: 0.66rem;
        letter-spacing: 0.08em;
      }
      .command-trace__dot {
        width: 5px;
        height: 5px;
        flex-shrink: 0;
        border-radius: 9999px;
        background: var(--text-faint);
        transition: background-color 0.3s var(--ease-hover);
      }
      .command-trace__step--pending { color: var(--text-faint); }
      .command-trace__step--active { color: var(--text-primary); }
      .command-trace__step--active .command-trace__dot {
        background: var(--accent);
        animation: command-trace-pulse 1.2s ease-in-out infinite;
      }
      .command-trace__step--done { color: var(--text-tertiary); }
      .command-trace__step--done .command-trace__dot {
        background: var(--accent-teal);
      }
      @keyframes command-trace-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.45; }
      }

      /* Inline working notes — dim mono scratchpad, newest line brightest */
      .command-thinking__notes {
        display: flex;
        flex-direction: column;
        font-family: var(--font-mono);
        font-size: 0.7rem;
        line-height: 1.65;
        color: var(--text-tertiary);
        max-height: calc(4 * 1.65em);
        overflow: hidden;
      }
      .command-thinking__note {
        display: block;
        white-space: pre-wrap;
        word-break: break-word;
      }

      @media (prefers-reduced-motion: reduce) {
        .command-bento .tile {
          transition: none;
        }
        .command-bento--thinking .tile,
        .command-trace__step--active .command-trace__dot {
          animation: none;
        }
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
