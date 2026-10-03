"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { DirectorAction, DirectorEvent, DirectorMessage } from "@/lib/director/protocol";
import { isDirectorConfigured, remember, streamDirector } from "@/lib/director/client";
import { explainMatch, offlineDirector } from "@/lib/director/offline";
import { signalStore } from "@/lib/signal-store";
import { runAction, releaseStage, sleep } from "./executor";
import { Narrator } from "./narrator";
import { INITIAL_STATE, type DirectorState } from "./types";

const OUTRO_HOLD_MS = 2400;
const ENERGY_FLOOR = 0.14;
const ENERGY_DECAY = 0.9;
const ENERGY_TICK_MS = 70;
const MAX_LOG_LINES = 5;

/** The model may chain many tool calls; cap the run so a loop can never trap the visitor. */
const MAX_ACTIONS = 14;

/** Set on <body> while a take runs, so site chrome (the mobile contact bar) can step aside. */
const ACTIVE_CLASS = "director-active";

export function useDirectorRun() {
  const router = useRouter();
  const [state, setState] = useState<DirectorState>(INITIAL_STATE);
  const stateRef = useRef(state);
  const abortRef = useRef<AbortController | null>(null);
  const historyRef = useRef<DirectorMessage[]>([]);
  const takeRef = useRef(0);
  const figRef = useRef(0);
  const logId = useRef(0);
  const narratorRef = useRef<Narrator | null>(null);

  const patch = useCallback((next: Partial<DirectorState>) => {
    stateRef.current = { ...stateRef.current, ...next };
    setState(stateRef.current);
  }, []);

  useEffect(() => {
    narratorRef.current = new Narrator((words) => patch({ words }));
    return () => {
      abortRef.current?.abort();
      narratorRef.current?.dispose();
      releaseStage();
    };
  }, [patch]);

  const active = state.phase !== "idle";
  useEffect(() => {
    if (!active) return;
    document.body.classList.add(ACTIVE_CLASS);
    return () => document.body.classList.remove(ACTIVE_CLASS);
  }, [active]);

  const cut = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const run = useCallback(
    async (rawPrompt: string) => {
      const prompt = rawPrompt.trim();
      const narrator = narratorRef.current;
      if (!prompt || !narrator || stateRef.current.phase !== "idle") return;

      const ctrl = new AbortController();
      const { signal } = ctrl;
      abortRef.current = ctrl;
      takeRef.current += 1;
      figRef.current = 0;

      const live = isDirectorConfigured();
      const messages = remember(historyRef.current, { role: "user", content: prompt });
      let deferred: string | null = null;
      let navigating = false;
      let transcript = "";
      const done: string[] = [];

      const log = (text: string) => {
        const line = { id: (logId.current += 1), text };
        patch({ log: [...stateRef.current.log, line].slice(-MAX_LOG_LINES) });
      };

      narrator.reset();
      patch({
        phase: "running",
        mode: live ? "live" : "offline",
        take: takeRef.current,
        prompt,
        words: [],
        spoken: "",
        log: [],
        figure: null,
        afterglow: false,
        startedAt: performance.now(),
      });

      const energy = setInterval(() => {
        const { energy: e, set } = signalStore.getState();
        set({ energy: Math.max(ENERGY_FLOOR, e * ENERGY_DECAY) });
      }, ENERGY_TICK_MS);

      async function* source(): AsyncGenerator<DirectorEvent> {
        if (live) {
          try {
            for await (const event of streamDirector(messages, signal)) {
              if (event.type === "error") throw new Error(event.message);
              yield event;
            }
            return;
          } catch {
            if (signal.aborted) return;
            narrator!.reset();
            releaseStage();
            deferred = null;
            transcript = "";
            patch({ mode: "offline", spoken: "", figure: null });
            log("live director unreachable, playing the scripted tour");
          }
        }
        log(explainMatch(prompt));
        yield* offlineDirector(prompt, signal);
      }

      const exec = {
        signal,
        log,
        showFigure: (label: string) => {
          figRef.current += 1;
          patch({ figure: { n: figRef.current, label } });
        },
        deferNavigation: (slug: string) => {
          deferred = slug;
        },
      };

      try {
        let actions = 0;
        const act = async (action: DirectorAction) => {
          done.push(action.name === "goto_chapter" ? `goto ${action.args.chapter}` : action.name);
          await runAction(action, exec);
          narrator.markBreak();
        };
        for await (const event of source()) {
          if (signal.aborted) break;
          if (event.type === "text") {
            narrator.push(event.delta);
            transcript += event.delta;
            const set = signalStore.getState().set;
            set({ energy: Math.min(1, signalStore.getState().energy + event.delta.length * 0.04) });
          } else if (event.type === "action") {
            if (event.action.name === "end_scene") break;
            if (++actions > MAX_ACTIONS) break;
            await narrator.idle(8, signal);
            patch({ spoken: narrator.caption });
            await act(event.action);
          } else if (event.type === "done") {
            break;
          }
        }

        if (!signal.aborted) {
          await narrator.idle(0, signal);
          patch({ spoken: narrator.caption });
          await sleep(OUTRO_HOLD_MS, signal);
        }

        if (!signal.aborted && deferred) {
          patch({ phase: "outro" });
          log(`opening ${deferred}`);
          await sleep(700, signal);
          if (!signal.aborted) {
            navigating = true;
            router.push(`/work/${deferred}/`);
          }
        }
      } finally {
        clearInterval(energy);
        if (!navigating) narrator.halt();
        if (transcript) {
          const summary = done.length ? ` [directed: ${done.join(", ")}]` : "";
          historyRef.current = remember(messages, { role: "assistant", content: transcript.trim() + summary });
        }
        abortRef.current = null;
        // Navigating away: the HUD stays until the route swaps and this hook unmounts.
        if (!navigating) {
          releaseStage();
          patch({ phase: "idle", afterglow: true });
        }
      }
    },
    [patch, router],
  );

  return { state, run, cut };
}
