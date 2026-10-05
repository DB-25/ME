import usage from "@/content/agent-usage.json";

const DAY_MS = 86_400_000;
const DAYS_PER_WEEK = 7;
const LEVELS = 4;
/** Columns a month name needs before the next one starts. */
const OPENING_MONTH_ROOM = 3;
/** Past this many weeks only quarters are named (Jan, Apr, Jul, Oct), or the names run into each other. */
const QUARTERS_ONLY_AFTER_WEEKS = 40;
const QUARTER_MONTHS = new Set([0, 3, 6, 9]);

const NUMBER = new Intl.NumberFormat("en-US");
const PERCENT = new Intl.NumberFormat("en-US", { style: "percent", maximumFractionDigits: 1 });
const MONTH = new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" });
const LONG_MONTH = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
/** A January mark names its year instead, so a strip that spans two years reads unambiguously. */
const monthMark = (t: number) => (new Date(t).getUTCMonth() === 0 ? String(new Date(t).getUTCFullYear()) : MONTH.format(t));
/** The site's date style, "5 Oct 2026". Intl en-GB spells September "Sept", so the parts are joined by hand. */
const dayMonth = (t: number) => `${new Date(t).getUTCDate()} ${MONTH.format(t)}`;
const fullDate = (t: number) => `${dayMonth(t)} ${new Date(t).getUTCFullYear()}`;

const toTime = (iso: string) => Date.parse(`${iso}T00:00:00Z`);

export type HeatCell = { key: number; level: number; inRange: boolean };
export type MonthMark = { label: string; column: number };

/** Compact quartile thresholds over the active days, so one runaway day does not wash the rest to the palest step. */
function thresholds(turns: number[]): number[] {
  const sorted = [...turns].sort((a, b) => a - b);
  return Array.from({ length: LEVELS - 1 }, (_, i) => sorted[Math.floor((sorted.length * (i + 1)) / LEVELS)] ?? 0);
}

function build() {
  const from = toTime(usage.from);
  const to = toTime(usage.to);
  const byDay = new Map<string, number>(usage.daily.map(([day, turns]) => [day as string, turns as number]));
  const cuts = thresholds([...byDay.values()]);

  // Weeks run Monday to Sunday, one column each, so the strip starts on the Monday on or before the first day.
  const mondayOffset = (new Date(from).getUTCDay() + 6) % DAYS_PER_WEEK;
  const start = from - mondayOffset * DAY_MS;
  const weeks = Math.ceil(((to - start) / DAY_MS + 1) / DAYS_PER_WEEK);

  const cells: HeatCell[] = Array.from({ length: weeks * DAYS_PER_WEEK }, (_, i) => {
    const time = start + i * DAY_MS;
    const turns = byDay.get(new Date(time).toISOString().slice(0, 10)) ?? 0;
    const level = turns === 0 ? 0 : 1 + cuts.filter((cut) => turns > cut).length;
    return { key: i, level: Math.min(level, LEVELS), inRange: time >= from && time <= to };
  });

  // A month is named over the first week that contains its 1st. The opening month is dropped when the next one is
  // too close for both names to fit.
  const months: MonthMark[] = [];
  for (let w = 0; w < weeks; w++) {
    const first = Array.from({ length: DAYS_PER_WEEK }, (_, d) => start + (w * DAYS_PER_WEEK + d) * DAY_MS).find((t) => new Date(t).getUTCDate() === 1 && t >= from && t <= to);
    if (first === undefined) continue;
    if (weeks > QUARTERS_ONLY_AFTER_WEEKS && !QUARTER_MONTHS.has(new Date(first).getUTCMonth())) continue;
    months.push({ label: monthMark(first), column: w + 1 });
  }
  // A name that starts in the last few columns would run off the right edge.
  while (months.length > 0 && months[months.length - 1]!.column > weeks - OPENING_MONTH_ROOM + 1) months.pop();
  // Quarter marks sit far apart in columns but close in pixels on a phone, so the opening name needs more room there.
  const openingRoom = weeks > QUARTERS_ONLY_AFTER_WEEKS ? OPENING_MONTH_ROOM * 3 : OPENING_MONTH_ROOM;
  if (months[0]?.column !== 1 && (months[0]?.column ?? Infinity) > openingRoom) {
    months.unshift({ label: monthMark(from), column: 1 });
  }

  const spanDays = Math.round((to - from) / DAY_MS) + 1;
  const sameYear = new Date(from).getUTCFullYear() === new Date(to).getUTCFullYear();
  return {
    cells,
    months,
    weeks,
    spanDays,
    window: `${sameYear ? dayMonth(from) : fullDate(from)} to ${fullDate(to)}`,
    busiestDay: fullDate(toTime(usage.busiest.day)),
    /** "February 2025", for the headline. */
    sinceMonth: LONG_MONTH.format(from),
    /** Where Claude Code's own logs start, which is later than Cursor's. */
    claudeSince: fullDate(toTime(usage.tools.claudeCode.from)),
  };
}

export const heat = build();

export const fmt = {
  count: (n: number) => NUMBER.format(n),
  compact: (n: number, digits: number) => new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: digits }).format(n),
  percent: (n: number) => PERCENT.format(n),
};

export { usage };
