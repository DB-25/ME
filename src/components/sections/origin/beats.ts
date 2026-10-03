import { timeline, type TimelineEntry } from "@/content";

/** The beats of the journey, picked from the timeline by title. Facts stay in content. */
const BEAT_TITLES = [
  "B.E. in Computer Science",
  "Software Engineer, Flutter",
  "Crossing oceans",
  "GenAI Product Development Co-op",
  "Lead AI Engineer on A-IEP",
  "From shipping to measuring",
];

export type CityId = "bangalore" | "boston";

export type Beat = TimelineEntry & { id: string; city: CityId };

export const CITIES: Record<CityId, { name: string; coords: string; text: string; label: string; bg: string }> = {
  bangalore: { name: "Bangalore", coords: "12.97°N 77.59°E", text: "text-saffron", label: "!text-saffron", bg: "var(--color-saffron)" },
  boston: { name: "Boston", coords: "42.36°N 71.06°W", text: "text-accent", label: "!text-accent", bg: "var(--color-accent)" },
};

export const BEATS: Beat[] = BEAT_TITLES.flatMap((title, i) => {
  const entry = timeline.find((t) => t.title === title);
  if (!entry) return [];
  const city: CityId = entry.place.includes("Bangalore") ? "bangalore" : "boston";
  return [{ ...entry, id: `origin-beat-${i}`, city }];
});

/** For each of the four year digits, the cumulative number of forward steps per beat, so digits only ever roll forward. */
export function digitTravel(beats: Beat[]): number[][] {
  const digits = beats.map((b) => b.year.padStart(4, " ").split("").map((c) => Number(c) || 0));
  return [0, 1, 2, 3].map((pos) => {
    const out: number[] = [];
    digits.forEach((d, i) => {
      if (i === 0) return out.push(d[pos]);
      const step = (d[pos] - digits[i - 1][pos] + 10) % 10;
      out.push(out[i - 1] + step);
    });
    return out;
  });
}

/** Number of cells in each digit strip, for converting travel into yPercent. */
export const digitCells = (travel: number[][]): number[] => travel.map((t) => t[t.length - 1] + 1);
