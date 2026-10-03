"use client";

import { getLineAudio, shouldPlayVoice } from "@/lib/director/voice";

/**
 * Plays pre-rendered narration, one file per line, through a single reusable
 * audio element. Progress is read from the element's clock while it plays, so
 * the caption highlight and the action queue follow the sound, not a timer.
 */

/** "ended": played to the end. "missing": no usable audio for this line (caption runs on a timer). */
export type PlayResult = "ended" | "missing" | "aborted";

export interface LineAudioEngine {
  /** Unlock the audio element from inside a user gesture (iOS Safari needs it). */
  prime(): void;
  /** Play one line. `onProgress` gets 0..1 of its duration. */
  play(text: string, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<PlayResult>;
  /** Warm the cache for a line that will play soon. */
  preload(text: string): void;
  cancel(): void;
}

/** One silent sample: enough to unlock playback. */
const SILENCE = "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";
const LOAD_TIMEOUT_MS = 6000;
const TICK_MS = 40;
const END_GRACE_MS = 3000;
/** The clock has not moved this long after play(): the output device is stuck, so stop waiting for it. */
const STALL_MS = 2500;
/** play() has not resolved this long after canplay: the output never opened. */
const START_MS = 4000;

class LineAudio implements LineAudioEngine {
  private el: HTMLAudioElement | null = null;
  private warmed = new Set<string>();
  /** Ends the line in progress early (the visitor switched the voice off). */
  private endEarly: (() => void) | null = null;

  private element(): HTMLAudioElement {
    if (!this.el) {
      this.el = new Audio();
      this.el.preload = "auto";
    }
    return this.el;
  }

  prime() {
    if (!shouldPlayVoice()) return;
    const el = this.element();
    el.muted = true;
    el.src = SILENCE;
    void el.play().then(
      () => el.pause(),
      () => undefined,
    );
  }

  preload(text: string) {
    if (!shouldPlayVoice()) return;
    void getLineAudio(text).then((url) => {
      if (!url || this.warmed.has(url)) return;
      this.warmed.add(url);
      // The audio element will be served from the HTTP cache when its turn comes.
      void fetch(url).catch(() => this.warmed.delete(url));
    });
  }

  async play(text: string, signal: AbortSignal, onProgress: (fraction: number) => void): Promise<PlayResult> {
    const url = await getLineAudio(text);
    if (signal.aborted) return "aborted";
    if (!url) return "missing";

    const el = this.element();
    el.muted = false;
    el.onended = el.onerror = el.oncanplay = null;

    return new Promise<PlayResult>((resolve) => {
      let settled = false;
      let ticker: number | undefined;
      let guard: number | undefined;

      const finish = (result: PlayResult) => {
        if (settled) return;
        settled = true;
        window.clearInterval(ticker);
        window.clearTimeout(guard);
        signal.removeEventListener("abort", onAbort);
        el.onended = el.onerror = el.oncanplay = null;
        if (result !== "ended") el.pause();
        this.endEarly = null;
        resolve(result);
      };
      this.endEarly = () => finish("ended");
      const onAbort = () => finish("aborted");
      signal.addEventListener("abort", onAbort, { once: true });

      const begin = () => {
        el.oncanplay = null;
        window.clearTimeout(guard);
        guard = window.setTimeout(() => finish("missing"), START_MS);
        el.play().then(
          () => {
            window.clearTimeout(guard);
            const grace = (Number.isFinite(el.duration) ? el.duration * 1000 : 30_000) + END_GRACE_MS;
            guard = window.setTimeout(() => finish("ended"), grace);
            let lastTime = -1;
            let lastMove = performance.now();
            ticker = window.setInterval(() => {
              const now = performance.now();
              if (el.currentTime !== lastTime) {
                lastTime = el.currentTime;
                lastMove = now;
              } else if (now - lastMove > STALL_MS) {
                // Never started: let the caption run on its timer. Stopped part way: move on.
                return finish(el.currentTime < 0.05 ? "missing" : "ended");
              }
              if (Number.isFinite(el.duration) && el.duration > 0) onProgress(Math.min(1, el.currentTime / el.duration));
            }, TICK_MS);
          },
          () => finish("missing"), // blocked or undecodable: say nothing, keep the captions moving
        );
      };

      el.onended = () => {
        onProgress(1);
        finish("ended");
      };
      el.onerror = () => finish("missing");
      el.oncanplay = begin;
      guard = window.setTimeout(() => finish("missing"), LOAD_TIMEOUT_MS);
      el.src = url;
      el.load();
    });
  }

  cancel() {
    this.endEarly?.();
    this.el?.pause();
  }
}

export const lineAudio: LineAudioEngine = new LineAudio();
