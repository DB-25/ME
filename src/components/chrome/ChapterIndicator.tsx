"use client";

import { usePathname } from "next/navigation";
import { chapterById } from "@/lib/chapters";
import { useSignal } from "@/lib/signal-store";
import { plainLabel } from "./nav-items";
import { Roll } from "./Roll";

/** What a route without chapters calls itself: a case study, the work index, or nothing at all (the 404). */
function routeLabel(pathname: string): string {
  const path = pathname.replace(/\/+$/, "");
  if (path === "/work") return "WORK INDEX";
  if (path.startsWith("/work/")) return "CASE STUDY";
  return "NOT FOUND";
}

/** Live "03 / ABOUT" readout, driven by the signal store. Routes without chapters name the page instead. */
export function ChapterIndicator({ className = "" }: { className?: string }) {
  const id = useSignal((s) => s.chapter);
  const pathname = usePathname();
  const isHome = pathname === "/";
  const c = chapterById(id);
  const text = isHome ? `${c.index} / ${plainLabel(c.id, c.label).toUpperCase()}` : routeLabel(pathname);
  return (
    <p className={`label inline-block min-w-[13ch] whitespace-nowrap !text-ink ${className}`} aria-live="off">
      <Roll value={text} />
    </p>
  );
}
