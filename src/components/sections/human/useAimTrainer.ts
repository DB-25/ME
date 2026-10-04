"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const ROUND_SIZE = 5;
const BEST_KEY = "db.aim.best";
const MIN_DELAY_MS = 550;
const MAX_DELAY_MS = 1500;
const X_RANGE = [11, 89] as const;
const Y_RANGE = [16, 84] as const;
const MIN_JUMP = 28;

export type Phase = "idle" | "waiting" | "live" | "done";
export type Pos = { x: number; y: number };
export type Burst = { id: number; x: number; y: number; label: string; kind: "hit" | "miss" };

const rand = (min: number, max: number) => min + Math.random() * (max - min);

function nextPos(prev: Pos | null): Pos {
  let p: Pos = { x: rand(...X_RANGE), y: rand(...Y_RANGE) };
  for (let i = 0; i < 8 && prev && Math.hypot(p.x - prev.x, p.y - prev.y) < MIN_JUMP; i++) {
    p = { x: rand(...X_RANGE), y: rand(...Y_RANGE) };
  }
  return p;
}

function readBest(): number | null {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isFinite(n) && n > 0 ? n : null;
  } catch {
    return null;
  }
}

function writeBest(ms: number) {
  try {
    window.localStorage.setItem(BEST_KEY, String(ms));
  } catch {
    /* storage blocked: the best just lives for this visit */
  }
}

export function rankFor(avg: number): string {
  if (avg < 250) return "Fast. Nothing to add.";
  if (avg < 330) return "Quick.";
  if (avg < 450) return "Solid.";
  return "Slower than usual. Go again.";
}

/**
 * Tiny reaction drill. Five targets, each appears after a random wait. Pointer
 * or touch hits time from the moment the target is shown to pointerdown;
 * Space is the keyboard route and times pure reaction.
 */
export function useAimTrainer() {
  const [phase, setPhaseState] = useState<Phase>("idle");
  const [hits, setHits] = useState<number[]>([]);
  const [pos, setPos] = useState<Pos | null>(null);
  const [misses, setMisses] = useState(0);
  const [best, setBest] = useState<number | null>(null);
  const [burst, setBurst] = useState<Burst | null>(null);
  const [status, setStatus] = useState("");
  const [early, setEarly] = useState(false);

  const phaseRef = useRef<Phase>("idle");
  const hitsRef = useRef<number[]>([]);
  const lastPos = useRef<Pos | null>(null);
  const shownAt = useRef(0);
  const timer = useRef<number | undefined>(undefined);
  const burstId = useRef(0);

  const setPhase = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  }, []);

  useEffect(() => {
    // localStorage only exists after mount; reading it here keeps SSR markup stable.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setBest(readBest());
    return () => window.clearTimeout(timer.current);
  }, []);

  const arm = useCallback(() => {
    window.clearTimeout(timer.current);
    setPos(null);
    setPhase("waiting");
    timer.current = window.setTimeout(() => {
      const p = nextPos(lastPos.current);
      lastPos.current = p;
      setPos(p);
      shownAt.current = performance.now();
      setEarly(false);
      setPhase("live");
      setStatus("Target. Press Space or hit it.");
    }, rand(MIN_DELAY_MS, MAX_DELAY_MS));
  }, [setPhase]);

  const start = useCallback(() => {
    hitsRef.current = [];
    lastPos.current = null;
    setHits([]);
    setMisses(0);
    setBurst(null);
    setEarly(false);
    setStatus("Drill started. Wait for the target.");
    arm();
  }, [arm]);

  const finish = useCallback(
    (all: number[]) => {
      const avg = Math.round(all.reduce((a, b) => a + b, 0) / all.length);
      const fastest = Math.min(...all);
      setPos(null);
      setPhase("done");
      setBest((prev) => {
        if (prev !== null && prev <= fastest) return prev;
        writeBest(fastest);
        return fastest;
      });
      setStatus(`Drill complete. Average ${avg} milliseconds. ${rankFor(avg)}`);
    },
    [setPhase],
  );

  const registerHit = useCallback(
    (at: number, where: Pos | null) => {
      if (phaseRef.current !== "live") return;
      const ms = Math.max(1, Math.round(at - shownAt.current));
      const all = [...hitsRef.current, ms];
      hitsRef.current = all;
      setHits(all);
      burstId.current += 1;
      if (where) setBurst({ id: burstId.current, x: where.x, y: where.y, label: `${ms}`, kind: "hit" });
      setStatus(`Target ${all.length} of ${ROUND_SIZE}: ${ms} milliseconds.`);
      if (all.length >= ROUND_SIZE) finish(all);
      else arm();
    },
    [arm, finish],
  );

  const tooEarly = useCallback(() => {
    setStatus("Too early. Wait for the target.");
    setEarly(true);
    arm();
  }, [arm]);

  const registerMiss = useCallback((where: Pos) => {
    burstId.current += 1;
    setBurst({ id: burstId.current, x: where.x, y: where.y, label: "", kind: "miss" });
    setMisses((m) => m + 1);
    setStatus("Miss.");
  }, []);

  /** Pointer or touch landed on the arena (not on the target). */
  const onArenaPointer = useCallback(
    (where: Pos) => {
      if (phaseRef.current === "waiting") tooEarly();
      else if (phaseRef.current === "live") registerMiss(where);
    },
    [tooEarly, registerMiss],
  );

  /** Space. Returns true if the key was consumed. */
  const onSpace = useCallback(
    (at: number): boolean => {
      if (phaseRef.current === "waiting") {
        tooEarly();
        return true;
      }
      if (phaseRef.current === "live") {
        registerHit(at, lastPos.current);
        return true;
      }
      return false;
    },
    [tooEarly, registerHit],
  );

  const average = hits.length ? Math.round(hits.reduce((a, b) => a + b, 0) / hits.length) : null;
  const last = hits.length ? hits[hits.length - 1] : null;

  return { phase, hits, pos, misses, best, burst, status, early, average, last, start, registerHit, onArenaPointer, onSpace };
}
