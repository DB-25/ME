import { normalizeLine } from "@/lib/director/lineId";
import { lineAudio, type LineAudioEngine } from "./lineAudio";

/**
 * Paces narration into subtitles and keeps the run in step with the voice.
 *
 * Narration arrives as lines: whole scripted lines (ended by a newline), or text
 * streamed from a model, which is cut into sentences. Lines are played one after
 * another. A line with pre-rendered audio plays that audio and the captions follow
 * its clock; a line without any (or with the voice off) runs on a reading-pace
 * timer. `idle()` resolves only when the queue has finished playing, so the
 * Director never acts ahead of its own line.
 *
 * A long line is shown as several short captions, each laid out whole before it
 * starts, with only the highlight moving. Nothing reflows while it plays.
 */

/** A caption on screen: its words, and which one is being spoken (-1 before, length after). */
export type Caption = { id: number; words: string[]; active: number };

/** Reading pace when nobody is speaking. */
const TIMED_CHARS_PER_SECOND = 17;
const TIMED_MIN_MS = 700;
/** A beat of silence between lines. */
const GAP_MS = 220;
/** Chunks longer than this are split at a clause break so a caption stays within three lines. */
const MAX_CHUNK_CHARS = 96;

const SENTENCE_END = /(?<=[.!?])\s+(?=[A-Z0-9"'])/;
const CLAUSE_BREAK = /(?<=[,:;])\s+/;

/** Split a line into captions: sentences, then clauses for the long ones. */
export function toChunks(text: string): string[] {
  return text
    .split(SENTENCE_END)
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((sentence) => {
      if (sentence.length <= MAX_CHUNK_CHARS) return [sentence];
      const out: string[] = [];
      for (const part of sentence.split(CLAUSE_BREAK)) {
        const last = out[out.length - 1];
        if (last && last.length + part.length < MAX_CHUNK_CHARS * 0.6) out[out.length - 1] = `${last} ${part}`;
        else out.push(part);
      }
      return out;
    });
}

const wait = (ms: number, signal: AbortSignal) =>
  new Promise<void>((resolve) => {
    if (signal.aborted) return resolve();
    const done = () => {
      window.clearTimeout(timer);
      signal.removeEventListener("abort", done);
      resolve();
    };
    const timer = window.setTimeout(done, ms);
    signal.addEventListener("abort", done, { once: true });
  });

/** Where playback of a line stands, as a caption: which chunk, and which word in it. */
function captionAt(chunks: string[], fraction: number): { chunk: number; word: number } {
  const total = chunks.reduce((n, c) => n + c.length, 0);
  const at = Math.min(0.999999, Math.max(0, fraction)) * total;
  let start = 0;
  for (let chunk = 0; chunk < chunks.length; chunk++) {
    const end = start + chunks[chunk].length;
    if (at < end || chunk === chunks.length - 1) {
      const inChunk = Math.max(0, at - start);
      let word = 0;
      for (const m of chunks[chunk].matchAll(/\S+/g)) {
        if ((m.index ?? 0) <= inChunk) word += 1;
      }
      return { chunk, word: Math.max(0, word - 1) };
    }
    start = end;
  }
  return { chunk: 0, word: 0 };
}

export class Narrator {
  private buffer = "";
  private queue: string[] = [];
  private pumping = false;
  private nextId = 0;
  private waiters: Array<() => void> = [];
  private ctrl = new AbortController();

  constructor(
    private readonly onCaption: (caption: Caption | null) => void,
    private readonly wantsVoice: () => boolean,
    private readonly engine: LineAudioEngine = lineAudio,
  ) {}

  /** True while a line is playing (aloud or on the timer). */
  get isPlaying(): boolean {
    return this.pumping;
  }

  /** Add text. Lines ended by a newline are queued whole; streamed sentences are queued as they complete. */
  push(delta: string) {
    this.buffer += delta;
    const lines = this.buffer.split("\n");
    this.buffer = lines.pop() ?? "";
    lines.forEach((line) => this.enqueue(line));

    const sentences = this.buffer.split(SENTENCE_END);
    if (sentences.length > 1) {
      this.buffer = sentences.pop() ?? "";
      sentences.forEach((s) => this.enqueue(s));
    }
  }

  /** Whatever is left is a finished thought: queue it. Call before each action. */
  flush() {
    const rest = this.buffer;
    this.buffer = "";
    this.enqueue(rest);
  }

  /** Resolves once everything queued has finished playing, or on halt. */
  idle(signal?: AbortSignal): Promise<void> {
    if (!this.pumping && !this.queue.length) return Promise.resolve();
    return new Promise((resolve) => {
      this.waiters.push(resolve);
      signal?.addEventListener("abort", () => resolve(), { once: true });
    });
  }

  /** Start a fresh take: drop everything pending and clear the caption. */
  reset() {
    this.stop();
    this.ctrl = new AbortController();
    this.buffer = "";
    this.queue = [];
    this.onCaption(null);
  }

  /** Stop the sound now but leave the current caption on screen so it can fade out. */
  halt() {
    this.stop();
    this.buffer = "";
    this.queue = [];
    this.releaseWaiters();
  }

  dispose() {
    this.halt();
  }

  private stop() {
    this.ctrl.abort();
    this.engine.cancel();
  }

  private enqueue(text: string) {
    const line = normalizeLine(text);
    if (!line || this.ctrl.signal.aborted) return;
    this.queue.push(line);
    void this.pump();
  }

  private async pump() {
    if (this.pumping) return;
    this.pumping = true;
    const { signal } = this.ctrl;
    try {
      while (this.queue.length && !signal.aborted) {
        await this.play(this.queue.shift()!, signal);
        if (this.queue.length) await wait(GAP_MS, signal);
      }
    } finally {
      this.pumping = false;
      this.releaseWaiters();
    }
  }

  private async play(line: string, signal: AbortSignal) {
    const chunks = toChunks(line);
    const base = (this.nextId += chunks.length);
    const show = (fraction: number) => {
      if (signal.aborted) return;
      const { chunk, word } = captionAt(chunks, fraction);
      const words = chunks[chunk].split(/\s+/).filter(Boolean);
      const active = fraction >= 1 && chunk === chunks.length - 1 ? words.length : word;
      this.onCaption({ id: base - chunks.length + chunk, words, active });
    };

    // The first caption is up before any sound, with no word lit yet.
    const first = chunks[0].split(/\s+/).filter(Boolean);
    this.onCaption({ id: base - chunks.length, words: first, active: -1 });
    if (this.queue[0]) this.engine.preload(this.queue[0]);

    if (this.wantsVoice()) {
      const result = await this.engine.play(line, signal, show);
      if (result === "aborted") return;
      if (result === "ended") return show(1);
    }
    await this.timed(line, signal, show);
    show(1);
  }

  /** Walk the highlight through the line at reading pace. */
  private async timed(line: string, signal: AbortSignal, show: (fraction: number) => void) {
    const total = Math.max(TIMED_MIN_MS, (line.length / TIMED_CHARS_PER_SECOND) * 1000);
    const t0 = performance.now();
    while (!signal.aborted) {
      const elapsed = performance.now() - t0;
      if (elapsed >= total) return;
      show(elapsed / total);
      await wait(50, signal);
    }
  }

  private releaseWaiters() {
    const done = this.waiters;
    this.waiters = [];
    done.forEach((resolve) => resolve());
  }
}
