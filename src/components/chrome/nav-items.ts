import type { ChapterId } from "@/lib/director/protocol";

/** Plain-language nav. `id` is the chapter the link scrolls to. */
export const NAV_ITEMS: { id: ChapterId; label: string }[] = [
  { id: "work", label: "Work" },
  { id: "impact", label: "Impact" },
  { id: "origin", label: "About" },
  { id: "contact", label: "Contact" },
];

/** Chapter names as shown in the indicator and the rail (lib/chapters.ts keeps the creative names). */
const PLAIN_LABEL: Partial<Record<ChapterId, string>> = {
  hero: "Intro",
  origin: "About",
};

export const plainLabel = (id: ChapterId, fallback: string) => PLAIN_LABEL[id] ?? fallback;
