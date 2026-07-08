"use client";

/**
 * useGlassBoxRun — the DB-1 glass-box orchestrator.
 *
 * Drives the phase machine (tokenize → retrieve → generate → compose → eval →
 * done), splits the streamed raw text into working notes + answer, pulses the
 * NeuralField refs, reveals vault docs, times the run, and fetches real
 * groundedness scores from /api/verify (live mode) or plays a scripted demo
 * trace (fallback mode).
 */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MutableRefObject,
} from "react";
import { splitNotes } from "@/lib/ai/notes-parser";
import { stripSceneTags } from "@/lib/ai/scene-detector";
import type { SceneId } from "@/components/command/bento-scenes";
import {
  PHASE_ORDER,
  type GlassPhase,
  type VaultDoc,
  type VerifyScores,
} from "./types";
import { getCannedNotes, getVaultDocs } from "./vault-docs";

// ---------------------------------------------------------------------------
// Timing constants
// ---------------------------------------------------------------------------

const TOKENIZE_MS = 500;
const DOC_REVEAL_MS = 250;
const RETRIEVE_TAIL_MS = 220;
const COMPOSE_MS = 700;
const FALLBACK_EVAL_MS = 850;
const FALLBACK_NOTES_TICK_MS = 22;
const FALLBACK_NOTES_TAIL_MS = 500;
const PULSE_COALESCE_MS = 40;
const DEAD_STREAM_BAIL_MS = 6000;

const FALLBACK_SCORES: VerifyScores = { faithfulness: 0.96, relevancy: 0.93 };
const GENERATE_IDX = PHASE_ORDER.indexOf("generate");

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface UseGlassBoxRunOptions {
  /** Overlay is open. Flipping true (or a new question while open) starts a run. */
  open: boolean;
  question: string;
  /** Streaming assistant text (live) or the canned answer (fallback). */
  raw: string;
  streaming: boolean;
  fallback: boolean;
  scene: SceneId;
}

export interface UseGlassBoxRunResult {
  phase: GlassPhase;
  /** Working-notes scratchpad text (streams during "generate"). */
  notes: string;
  /** Clean visible answer (notes + scene tags stripped). */
  answerText: string;
  vaultDocs: VaultDoc[];
  /** Incremented per streamed chunk — NeuralField diffs it in useFrame. */
  pulseRef: MutableRefObject<number>;
  /** Incremented per revealed vault doc — teal pulse from the vault cluster. */
  retrievalRef: MutableRefObject<number>;
  elapsedMs: number;
  tokenEstimate: number;
  /** Real scores from /api/verify, or the scripted pair in demo mode. Null = unavailable. */
  scores: VerifyScores | null;
  /** True when scores are scripted (offline demo trace). */
  demo: boolean;
  /** Retrieval breadth shown in the trace (= vaultDocs.length). */
  k: number;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useGlassBoxRun({
  open,
  question,
  raw,
  streaming,
  fallback,
  scene,
}: UseGlassBoxRunOptions): UseGlassBoxRunResult {
  const [phase, setPhase] = useState<GlassPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [scores, setScores] = useState<VerifyScores | null>(null);
  const [demo, setDemo] = useState(false);
  const [fallbackNotes, setFallbackNotes] = useState("");

  const pulseRef = useRef(0);
  const retrievalRef = useRef(0);

  const timersRef = useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
  const intervalsRef = useRef<Set<ReturnType<typeof setInterval>>>(new Set());
  const runIdRef = useRef(0);
  const startedAtRef = useRef(0);
  const lastPulseAtRef = useRef(0);
  const prevRawLenRef = useRef(0);
  /** `raw` snapshot at run start — a stale previous answer we must ignore
   *  until the live stream actually replaces it. */
  const baselineRawRef = useRef("");
  const prevOpenRef = useRef(false);
  const lastRunQuestionRef = useRef<string | null>(null);

  // ---- Vault docs re-derive from the (possibly late-classified) scene ----
  const vaultDocs = useMemo(() => getVaultDocs(scene), [scene]);
  const docsRef = useRef(vaultDocs);
  useEffect(() => {
    docsRef.current = vaultDocs;
  }, [vaultDocs]);

  const questionRef = useRef(question);
  useEffect(() => {
    questionRef.current = question;
  }, [question]);

  // ---- Timer plumbing ----
  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(() => {
      timersRef.current.delete(id);
      fn();
    }, ms);
    timersRef.current.add(id);
    return id;
  }, []);

  const unschedule = useCallback((id: ReturnType<typeof setTimeout>) => {
    clearTimeout(id);
    timersRef.current.delete(id);
  }, []);

  const clearAllTimers = useCallback(() => {
    timersRef.current.forEach((id) => clearTimeout(id));
    timersRef.current.clear();
    intervalsRef.current.forEach((id) => clearInterval(id));
    intervalsRef.current.clear();
  }, []);

  // ---- Run lifecycle ----
  const startRun = useCallback(() => {
    clearAllTimers();
    runIdRef.current += 1;
    pulseRef.current = 0;
    retrievalRef.current = 0;
    prevRawLenRef.current = 0;
    lastPulseAtRef.current = 0;
    setScores(null);
    setDemo(false);
    setFallbackNotes("");
    startedAtRef.current = Date.now();
    setElapsedMs(0);
    setPhase("tokenize");

    // Elapsed ticker — frozen on "done".
    const ticker = setInterval(() => {
      setElapsedMs(Date.now() - startedAtRef.current);
    }, 100);
    intervalsRef.current.add(ticker);

    // tokenize → retrieve → generate
    schedule(() => {
      setPhase("retrieve");
      const docs = docsRef.current;
      docs.forEach((_, i) => {
        schedule(() => {
          retrievalRef.current += 1;
        }, i * DOC_REVEAL_MS);
      });
      schedule(
        () => setPhase("generate"),
        docs.length * DOC_REVEAL_MS + RETRIEVE_TAIL_MS
      );
    }, TOKENIZE_MS);
  }, [clearAllTimers, schedule]);

  useEffect(() => {
    const justOpened = open && !prevOpenRef.current;
    const newQuestion = open && question !== lastRunQuestionRef.current;
    if (open && (justOpened || newQuestion) && question.trim()) {
      lastRunQuestionRef.current = question;
      baselineRawRef.current = raw;
      startRun();
    }
    if (!open && prevOpenRef.current) {
      // Closed (possibly mid-run): stop everything, rest at idle. The inline
      // answer in the command center persists independently.
      clearAllTimers();
      setPhase("idle");
    }
    prevOpenRef.current = open;
  }, [open, question, raw, startRun, clearAllTimers]);

  // Cleanup on unmount.
  useEffect(() => () => clearAllTimers(), [clearAllTimers]);

  // Freeze the elapsed ticker once done.
  useEffect(() => {
    if (phase !== "done") return;
    intervalsRef.current.forEach((id) => clearInterval(id));
    intervalsRef.current.clear();
    setElapsedMs(Date.now() - startedAtRef.current);
  }, [phase]);

  // ---- Effective raw: ignore the previous run's stale assistant text ----
  const effectiveRaw = useMemo(() => {
    if (!raw) return "";
    if (baselineRawRef.current && raw === baselineRawRef.current) return "";
    return raw;
    // baselineRawRef only changes alongside open/question renders.
  }, [raw]);

  // ---- Split notes / answer (streaming-safe) ----
  const split = useMemo(() => splitNotes(effectiveRaw), [effectiveRaw]);
  const liveAnswer = useMemo(
    () => stripSceneTags(split.answer).trim(),
    [split.answer]
  );
  const answerTextRef = useRef(liveAnswer);
  useEffect(() => {
    answerTextRef.current = liveAnswer;
  }, [liveAnswer]);

  // ---- Pulse per streamed chunk (live mode, coalesced ~1/40ms) ----
  useEffect(() => {
    if (!open || fallback) return;
    const len = effectiveRaw.length;
    if (len > prevRawLenRef.current) {
      prevRawLenRef.current = len;
      const now = Date.now();
      if (now - lastPulseAtRef.current >= PULSE_COALESCE_MS) {
        lastPulseAtRef.current = now;
        pulseRef.current += 1;
      }
    }
  }, [effectiveRaw, open, fallback]);

  // ---- Live mode: stream finished with content → compose ----
  useEffect(() => {
    if (!open || fallback || phase !== "generate") return;
    if (!streaming && effectiveRaw.trim().length > 0) {
      setPhase("compose");
      return;
    }
    if (!streaming) {
      // Stream ended with nothing (error without fallback flip) — bail to done
      // after a grace period rather than spinning forever.
      const id = schedule(() => setPhase("done"), DEAD_STREAM_BAIL_MS);
      return () => unschedule(id);
    }
  }, [open, fallback, phase, streaming, effectiveRaw, schedule, unschedule]);

  // ---- Fallback mode: scripted notes stream during "generate" ----
  useEffect(() => {
    if (!open || !fallback || phase !== "generate") return;
    const text = getCannedNotes(scene);
    if (!text) {
      const id = schedule(() => setPhase("compose"), FALLBACK_NOTES_TAIL_MS);
      return () => unschedule(id);
    }
    // Time-based progression: chars shown derive from elapsed time, so browser
    // timer throttling in hidden/backgrounded tabs can't stall the stream.
    let i = 0;
    const start = performance.now();
    const cps = 55; // characters per second
    const iv = setInterval(() => {
      const target = Math.min(
        text.length,
        Math.floor(((performance.now() - start) / 1000) * cps)
      );
      if (target > i) {
        i = target;
        setFallbackNotes(text.slice(0, i));
        const now = Date.now();
        if (now - lastPulseAtRef.current >= PULSE_COALESCE_MS) {
          lastPulseAtRef.current = now;
          pulseRef.current += 1;
        }
      }
      if (i >= text.length) {
        clearInterval(iv);
        intervalsRef.current.delete(iv);
        schedule(() => setPhase("compose"), FALLBACK_NOTES_TAIL_MS);
      }
    }, FALLBACK_NOTES_TICK_MS);
    intervalsRef.current.add(iv);
    return () => {
      clearInterval(iv);
      intervalsRef.current.delete(iv);
    };
  }, [open, fallback, phase, scene, schedule, unschedule]);

  // ---- compose → eval (tiles fly in during the pause) ----
  useEffect(() => {
    if (phase !== "compose") return;
    const id = schedule(() => setPhase("eval"), COMPOSE_MS);
    return () => unschedule(id);
  }, [phase, schedule, unschedule]);

  // ---- eval: real /api/verify (live) or scripted demo scores (fallback) ----
  useEffect(() => {
    if (phase !== "eval") return;
    const runId = runIdRef.current;

    if (fallback) {
      const id = schedule(() => {
        setScores(FALLBACK_SCORES);
        setDemo(true);
        setPhase("done");
      }, FALLBACK_EVAL_MS);
      return () => unschedule(id);
    }

    const controller = new AbortController();
    (async () => {
      let next: VerifyScores | null = null;
      try {
        const res = await fetch("/api/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            question: questionRef.current,
            answer: answerTextRef.current,
            sources: docsRef.current.map((d) => d.line),
          }),
          signal: controller.signal,
        });
        if (res.ok) {
          const data = (await res.json()) as Partial<VerifyScores>;
          if (
            typeof data.faithfulness === "number" &&
            typeof data.relevancy === "number"
          ) {
            next = {
              faithfulness: data.faithfulness,
              relevancy: data.relevancy,
            };
          }
        }
      } catch {
        next = null; // ANY failure → no scores, never fabricate.
      }
      if (runIdRef.current !== runId) return; // stale run
      setScores(next);
      setDemo(false);
      setPhase("done");
    })();
    return () => controller.abort();
  }, [phase, fallback, schedule, unschedule]);

  // ---- Outputs (notes/answer surface only once "generate" is reached, so a
  //      stale previous answer can never flash during the first frames) ----
  const phaseIdx = PHASE_ORDER.indexOf(phase);
  const notes =
    phaseIdx >= GENERATE_IDX ? (fallback ? fallbackNotes : split.notes) : "";
  const answerText = phaseIdx >= GENERATE_IDX ? liveAnswer : "";
  const tokenEstimate = Math.round(effectiveRaw.length / 4);

  return {
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
    k: vaultDocs.length,
  };
}
