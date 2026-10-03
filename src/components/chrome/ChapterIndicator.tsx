"use client";

import { usePathname } from "next/navigation";
import { chapterById } from "@/lib/chapters";
import { useSignal } from "@/lib/signal-store";
import { plainLabel } from "./nav-items";
import { Roll } from "./Roll";

/** Live "03 / ABOUT" readout, driven by the signal store. Routes without chapters show CASE STUDY. */
export function ChapterIndicator({ className = "" }: { className?: string }) {
  const id = useSignal((s) => s.chapter);
  const isHome = usePathname() === "/";
  const c = chapterById(id);
  const text = isHome ? `${c.index} / ${plainLabel(c.id, c.label).toUpperCase()}` : "CASE STUDY";
  return (
    <p className={`label inline-block min-w-[13ch] whitespace-nowrap !text-ink ${className}`} aria-live="off">
      <Roll value={text} />
    </p>
  );
}
