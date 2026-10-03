"use client";

import { useEffect } from "react";
import { CHAPTERS } from "@/lib/chapters";
import type { ChapterId } from "@/lib/director/protocol";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { signalStore } from "@/lib/signal-store";

/** A section's top travels from 85% to 25% of the viewport while its formation arrives. */
const MORPH_START = 0.85;
const MORPH_END = 0.25;

type Section = { id: ChapterId; el: HTMLElement; index: number };

function collectSections(): Section[] {
  const out: Section[] = [];
  document.querySelectorAll<HTMLElement>("[data-chapter]").forEach((el) => {
    const id = el.dataset.chapter as ChapterId;
    const index = CHAPTERS.findIndex((c) => c.id === id);
    if (index >= 0) out.push({ id, el, index });
  });
  return out.sort((a, b) => a.index - b.index);
}

/**
 * Drives `signalStore.chapter` and `.morph` from scroll.
 *
 * State is a pure function of scroll position: the current chapter is the last
 * section whose top has crossed 85% of the viewport, and `morph` is how far
 * that top has travelled toward 25%. The field morphs previous formation to
 * this one by `morph`, so scrolling backwards reverses the morph exactly.
 */
export function useChapterScroll() {
  useEffect(() => {
    let sections: Section[] = [];
    let triggers: ScrollTrigger[] = [];
    let raf = 0;

    const recompute = () => {
      if (sections.length === 0) return;
      const vh = window.innerHeight;
      const from = vh * MORPH_START;
      const span = vh * (MORPH_START - MORPH_END);
      let chapter = sections[0];
      let morph = 1;
      for (const s of sections) {
        const top = s.el.getBoundingClientRect().top;
        if (top > from) break;
        chapter = s;
        morph = s.index === 0 ? 1 : gsap.utils.clamp(0, 1, (from - top) / span);
      }
      const cur = signalStore.getState();
      if (cur.chapter !== chapter.id || Math.abs(cur.morph - morph) > 0.0005) {
        cur.set({ chapter: chapter.id, morph });
      }
    };

    const build = () => {
      triggers.forEach((t) => t.kill());
      sections = collectSections();
      triggers = sections.map((s) =>
        ScrollTrigger.create({
          trigger: s.el,
          start: `top ${MORPH_START * 100}%`,
          end: `top ${MORPH_END * 100}%`,
          onUpdate: recompute,
          onToggle: recompute,
          onRefresh: recompute,
        }),
      );
      recompute();
    };

    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        build();
        ScrollTrigger.refresh();
      });
    };

    build();

    // Sections mount in parallel with the field: rebuild whenever they appear or leave.
    const mo = new MutationObserver((records) => {
      const touched = records.some((r) =>
        [...r.addedNodes, ...r.removedNodes].some(
          (n) => n instanceof HTMLElement && (n.hasAttribute("data-chapter") || n.querySelector("[data-chapter]")),
        ),
      );
      if (touched) schedule();
    });
    mo.observe(document.body, { childList: true, subtree: true });

    // Layout shifts (fonts, images, accordions) move section tops.
    const main = document.getElementById("main") ?? document.body;
    let lastHeight = main.scrollHeight;
    const ro = new ResizeObserver(() => {
      if (Math.abs(main.scrollHeight - lastHeight) < 2) return;
      lastHeight = main.scrollHeight;
      ScrollTrigger.refresh();
      recompute();
    });
    ro.observe(main);

    window.addEventListener("scroll", recompute, { passive: true });
    window.addEventListener("resize", recompute);
    const settle = window.setTimeout(schedule, 800);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(settle);
      mo.disconnect();
      ro.disconnect();
      window.removeEventListener("scroll", recompute);
      window.removeEventListener("resize", recompute);
      triggers.forEach((t) => t.kill());
    };
  }, []);
}
