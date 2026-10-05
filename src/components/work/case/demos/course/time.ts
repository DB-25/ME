/** Time for the sandbox: whole minutes since 00:00 on Day 1, Boston clock. A learner's clock is that plus a fixed zone offset. */

export const MIN_PER_HOUR = 60;
export const MIN_PER_DAY = 1440;

/** Day number (1 = the day she signed up) on a clock that is `offset` minutes from Boston's. */
export function dayOf(at: number, offset = 0): number {
  return Math.floor((at + offset) / MIN_PER_DAY) + 1;
}

/** Local calendar date index and hour (0 to 23), the two things the quiet-hours and once-a-day rules read. */
export function localParts(at: number, offset = 0): { date: number; hour: number } {
  const t = at + offset;
  const date = Math.floor(t / MIN_PER_DAY);
  const hour = Math.floor((((t % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY) / MIN_PER_HOUR);
  return { date, hour };
}

/** `9:05 am`. */
export function clockOf(at: number, offset = 0): string {
  const t = (((at + offset) % MIN_PER_DAY) + MIN_PER_DAY) % MIN_PER_DAY;
  const h = Math.floor(t / MIN_PER_HOUR);
  const m = t % MIN_PER_HOUR;
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** `Day 3, 9:00 am`. */
export function stampOf(at: number, offset = 0): string {
  return `Day ${dayOf(at, offset)}, ${clockOf(at, offset)}`;
}

export const hoursBetween = (from: number, to: number): number => Math.floor((to - from) / MIN_PER_HOUR);

export const plural = (n: number, one: string, many = `${one}s`): string => `${n} ${n === 1 ? one : many}`;
