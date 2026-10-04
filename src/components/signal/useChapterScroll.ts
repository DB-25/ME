"use client";

import { useEffect } from "react";
import { CHAPTERS } from "@/lib/chapters";
import type { ChapterId } from "@/lib/director/protocol";
import { ScrollTrigger } from "@/lib/motion";
import { signalStore } from "@/lib/signal-store";
import { chapterPresence } from "./chapterPresence";
import { clamp01 } from "./ease";
import { afterPaint } from "./schedule";

/** A section's top travels from 85% to 25% of the viewport while its formation arrives. */
const MORPH_START = 0.85;
const MORPH_END = 0.25;
const SETTLE_MS = 800;
const MIN_MORPH_STEP = 0.0005;
const MIN_HEIGHT_DELTA = 2;

/** `top` is the section's document offset, cached and re-measured only on refresh. */
type Section = { id: ChapterId; el: HTMLElement; index: number; top: number };

function collectSections(): Section[] {
  const out: Section[] = [];
  document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => {
    const id = el.dataset.chapter as ChapterId;
    const index = CHAPTERS.findIndex((c) => c.id === id);
    if (index >= 0) out.push({ id, el, index, top: 0 });
  });
  return out.sort((a, b) => a.index - b.index);
}

function measure(sections: Section[]) {
  const y = window.scrollY;
  for (const s of sections) s.top = s.el.getBoundingClientRect().top + y;
}

function touchesChapter(records: MutationRecord[]): boolean {
  return records.some((r) =>
    [...r.addedNodes, ...r.removedNodes].some(
      (n) => n instanceof HTMLElement && (n.hasAttribute("data-chapter") || n.querySelector("[data-chapter]")),
    ),
  );
}

/**
 * Drives `signalStore.chapter` and `.morph` from scroll.
 *
 * State is a pure function of scroll position: the current chapter is the last
 * section whose top has crossed 85% of the viewport, and `morph` is how far
 * that top has travelled toward 25%. The field morphs previous formation to
 * this one by `morph`, so scrolling backwards reverses the morph exactly.
 *
 * One ScrollTrigger spans the page; section offsets are cached and re-measured
 * on ScrollTrigger refresh (resize, layout shifts, section mount), so a scroll
 * tick reads no layout.
 */
export function useChapterScroll() {
  // Section measuring forces a layout of the whole page, so it waits until after first paint instead of running inside hydration.
  useEffect(() => {
    let teardown = () => {};
    const cancel = afterPaint(() => {
      teardown = startChapterScroll();
    });
    return () => {
      cancel();
      teardown();
    };
  }, []);
}

function startChapterScroll(): () => void {
  let sections: Section[] = [];
  let raf = 0;

  const recompute = (scrollY: number) => {
    if (sections.length === 0) return;
    const vh = window.innerHeight;
    const from = vh * MORPH_START;
    const span = vh * (MORPH_START - MORPH_END);
    let chapter = sections[0];
    let morph = 1;
    for (const s of sections) {
      const top = s.top - scrollY;
      if (top > from) break;
      chapter = s;
      morph = s.index === 0 ? 1 : clamp01((from - top) / span);
    }
    const cur = signalStore.getState();
    if (cur.chapter !== chapter.id || Math.abs(cur.morph - morph) > MIN_MORPH_STEP) {
      cur.set({ chapter: chapter.id, morph });
    }
  };

  const rescan = () => {
    sections = collectSections();
    chapterPresence.present = sections.length > 0;
    measure(sections);
    recompute(window.scrollY);
  };

  const trigger = ScrollTrigger.create({
    start: 0,
    end: "max",
    onUpdate: (self) => recompute(self.scroll()),
  });
  // The global event fires once every trigger (pin spacers included) has settled.
  const onRefreshed = () => {
    measure(sections);
    recompute(window.scrollY);
  };
  ScrollTrigger.addEventListener("refresh", onRefreshed);

  // Sections mount in parallel with the field: rescan whenever they appear or leave.
  const schedule = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(rescan);
  };
  const main = document.getElementById("main") ?? document.body;
  const mo = new MutationObserver((records) => {
    if (touchesChapter(records)) schedule();
  });
  mo.observe(main, { childList: true, subtree: true });

  // Layout shifts (fonts, images, accordions) move section tops.
  let lastHeight = main.scrollHeight;
  const ro = new ResizeObserver(() => {
    if (Math.abs(main.scrollHeight - lastHeight) < MIN_HEIGHT_DELTA) return;
    lastHeight = main.scrollHeight;
    ScrollTrigger.refresh();
  });
  ro.observe(main);

  rescan();
  const settle = window.setTimeout(schedule, SETTLE_MS);

  return () => {
    cancelAnimationFrame(raf);
    window.clearTimeout(settle);
    mo.disconnect();
    ro.disconnect();
    ScrollTrigger.removeEventListener("refresh", onRefreshed);
    trigger.kill();
  };
}
