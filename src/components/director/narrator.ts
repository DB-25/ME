/**
 * Paces narration into subtitles. Words are released from elapsed wall-clock
 * time (never per tick), so a throttled background tab catches up in one
 * step instead of crawling.
 */

const CHARS_PER_SECOND = 26;
const TICK_MS = 50;
/** Longest caption kept on screen before the oldest sentence is dropped. */
const MAX_CAPTION_CHARS = 150;

type Token = { word: string; fresh: boolean };
export type CaptionWord = { id: number; text: string };

export class Narrator {
  private pending: Token[] = [];
  private words: CaptionWord[] = [];
  private nextId = 0;
  private breakNext = true;
  private budget = 0;
  private last = 0;
  private timer: ReturnType<typeof setInterval> | undefined;
  private waiters: Array<{ maxChars: number; resolve: () => void }> = [];

  constructor(private readonly onCaption: (words: CaptionWord[]) => void) {}

  /** Next pushed word starts a fresh caption. Call after each action. */
  markBreak() {
    this.breakNext = true;
  }

  push(delta: string) {
    const parts = delta.split(/(\s+)/).filter(Boolean);
    for (const part of parts) {
      if (/^\s+$/.test(part)) continue;
      this.pending.push({ word: part, fresh: this.breakNext });
      this.breakNext = false;
    }
    this.start();
  }

  /** Text revealed in the current caption. */
  get caption(): string {
    return this.words.map((w) => w.text).join(" ");
  }

  /** Resolves once at most `maxChars` characters of narration remain unrevealed. */
  idle(maxChars = 0, signal?: AbortSignal): Promise<void> {
    if (this.pendingChars() <= maxChars) return Promise.resolve();
    return new Promise((resolve) => {
      const waiter = { maxChars, resolve };
      this.waiters.push(waiter);
      signal?.addEventListener(
        "abort",
        () => {
          this.waiters = this.waiters.filter((w) => w !== waiter);
          resolve();
        },
        { once: true },
      );
    });
  }

  reset() {
    this.stop();
    this.pending = [];
    this.words = [];
    this.breakNext = true;
    this.budget = 0;
    this.onCaption([]);
    this.releaseWaiters();
  }

  /** Stop pacing but leave the current caption on screen so it can fade out. */
  halt() {
    this.stop();
    this.pending = [];
    this.budget = 0;
    this.releaseWaiters(true);
  }

  dispose() {
    this.stop();
    this.releaseWaiters(true);
  }

  private pendingChars(): number {
    return this.pending.reduce((n, t) => n + t.word.length + 1, 0);
  }

  private start() {
    if (this.timer) return;
    this.last = performance.now();
    this.timer = setInterval(() => this.tick(), TICK_MS);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  private tick() {
    const now = performance.now();
    this.budget += ((now - this.last) / 1000) * CHARS_PER_SECOND;
    this.last = now;

    let next = this.words;
    let changed = false;
    while (this.pending.length && this.budget >= this.pending[0].word.length + 1) {
      const token = this.pending.shift()!;
      this.budget -= token.word.length + 1;
      const item = { id: this.nextId++, text: token.word };
      next = token.fresh ? [item] : trimCaption([...next, item]);
      changed = true;
    }
    if (changed) {
      this.words = next;
      this.onCaption(next);
    }
    if (!this.pending.length) {
      this.budget = 0;
      this.stop();
    }
    this.releaseWaiters();
  }

  private releaseWaiters(all = false) {
    const chars = this.pendingChars();
    this.waiters = this.waiters.filter((w) => {
      if (all || chars <= w.maxChars) {
        w.resolve();
        return false;
      }
      return true;
    });
  }
}

/** Drop the oldest sentence(s) when a caption runs long. */
function trimCaption(words: CaptionWord[]): CaptionWord[] {
  let out = words;
  while (out.map((w) => w.text).join(" ").length > MAX_CAPTION_CHARS) {
    const cut = out.findIndex((w, i) => i < out.length - 1 && /[.!?]$/.test(w.text));
    if (cut === -1) return out;
    out = out.slice(cut + 1);
  }
  return out;
}
