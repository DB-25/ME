/**
 * Core Web Vitals, measured in this browser with plain PerformanceObservers (no library). Started the first time
 * the panel opens: LCP and CLS are replayed from the browser's buffer, so they cover the whole page load. INP only
 * sees interactions from then on, plus any slow ones the buffer kept.
 */

export type Rating = "good" | "needs work" | "poor";
export type VitalName = "lcp" | "cls" | "inp";

export type Vitals = {
  /** Milliseconds; null until the browser reports one. */
  lcp: number | null;
  /** Unitless layout shift score. */
  cls: number | null;
  /** Milliseconds; null until an interaction has been seen. */
  inp: number | null;
  /** Which of the three this browser can measure at all. */
  supported: Record<VitalName, boolean>;
};

const THRESHOLDS: Record<VitalName, [good: number, poor: number]> = {
  lcp: [2500, 4000],
  cls: [0.1, 0.25],
  inp: [200, 500],
};

export function rate(name: VitalName, value: number): Rating {
  const [good, poor] = THRESHOLDS[name];
  if (value <= good) return "good";
  return value <= poor ? "needs work" : "poor";
}

/** CLS counts the worst burst: shifts less than 1 s apart, a burst capped at 5 s. */
const SESSION_GAP_MS = 1000;
const SESSION_CAP_MS = 5000;
/** Event Timing ignores anything under this; 40 keeps ordinary taps visible without flooding. */
const EVENT_THRESHOLD_MS = 40;

type ShiftEntry = PerformanceEntry & { value: number; hadRecentInput: boolean };
type EventEntry = PerformanceEntry & { interactionId?: number };

let state: Vitals = { lcp: null, cls: null, inp: null, supported: { lcp: false, cls: false, inp: false } };
let started = false;
const listeners = new Set<() => void>();

export const getVitals = (): Vitals => state;

export function subscribeVitals(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function patch(next: Partial<Vitals>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

function observe(type: string, onEntries: (entries: PerformanceEntry[]) => void, extra: object = {}): boolean {
  if (typeof PerformanceObserver === "undefined" || !PerformanceObserver.supportedEntryTypes?.includes(type)) return false;
  try {
    new PerformanceObserver((list) => onEntries(list.getEntries())).observe({ type, buffered: true, ...extra } as PerformanceObserverInit);
    return true;
  } catch {
    return false;
  }
}

function watchLcp(): boolean {
  return observe("largest-contentful-paint", (entries) => {
    const last = entries[entries.length - 1];
    if (last) patch({ lcp: last.startTime });
  });
}

function watchCls(): boolean {
  let sessionValue = 0;
  let worst = 0;
  let sessionStart = 0;
  let lastShift = 0;
  return observe("layout-shift", (entries) => {
    for (const entry of entries as ShiftEntry[]) {
      if (entry.hadRecentInput) continue;
      const continues = sessionValue > 0 && entry.startTime - lastShift < SESSION_GAP_MS && entry.startTime - sessionStart < SESSION_CAP_MS;
      if (!continues) {
        sessionValue = 0;
        sessionStart = entry.startTime;
      }
      sessionValue += entry.value;
      lastShift = entry.startTime;
      worst = Math.max(worst, sessionValue);
    }
    patch({ cls: worst });
  });
}

function watchInp(): boolean {
  const longestById = new Map<number, number>();
  return observe(
    "event",
    (entries) => {
      let touched = false;
      for (const entry of entries as EventEntry[]) {
        if (!entry.interactionId) continue;
        longestById.set(entry.interactionId, Math.max(longestById.get(entry.interactionId) ?? 0, entry.duration));
        touched = true;
      }
      if (!touched) return;
      // The 98th percentile by interaction: the single worst until there are 50 of them.
      const sorted = [...longestById.values()].sort((a, b) => b - a);
      patch({ inp: sorted[Math.min(sorted.length - 1, Math.floor(sorted.length / 50))] });
    },
    { durationThreshold: EVENT_THRESHOLD_MS },
  );
}

export function startVitals() {
  if (started || typeof window === "undefined") return;
  started = true;
  patch({ supported: { lcp: watchLcp(), cls: watchCls(), inp: watchInp() } });
}
