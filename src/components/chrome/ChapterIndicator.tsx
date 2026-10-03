"use client";

import { chapterById } from "@/lib/chapters";
import { useSignal } from "@/lib/signal-store";
import { Roll } from "./Roll";

/** Live "03 / WORK" readout, driven by the signal store. */
export function ChapterIndicator({ className = "" }: { className?: string }) {
  const id = useSignal((s) => s.chapter);
  const c = chapterById(id);
  return (
    <p className={`label inline-block min-w-[13ch] whitespace-nowrap !text-ink ${className}`} aria-live="off">
      <Roll value={`${c.index} / ${c.label.toUpperCase()}`} />
    </p>
  );
}
