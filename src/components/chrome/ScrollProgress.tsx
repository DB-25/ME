"use client";

import { useEffect, useRef, useState } from "react";
import { CHAPTERS } from "@/lib/chapters";
import { useSignal } from "@/lib/signal-store";
import { gsap, scrollToTarget } from "@/lib/motion";

/** Ticks sit where each chapter really starts in the scroll range, not evenly spaced. */
function measure(): number[] {
  const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  return CHAPTERS.map((c, i) => {
    const el = document.querySelector<HTMLElement>(`[data-chapter="${c.id}"]`);
    if (!el) return i / (CHAPTERS.length - 1);
    const top = el.getBoundingClientRect().top + window.scrollY;
    return Math.min(1, Math.max(0, top / max));
  });
}

/** Thin right-edge rail: scroll fill + one tick per chapter, current tick in accent. */
export function ScrollProgress() {
  const ready = useSignal((s) => s.ready);
  const chapter = useSignal((s) => s.chapter);
  const root = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const [ratios, setRatios] = useState<number[]>(() => CHAPTERS.map((_, i) => i / (CHAPTERS.length - 1)));

  useEffect(() => {
    const update = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      const p = Math.min(1, Math.max(0, window.scrollY / max));
      if (fill.current) fill.current.style.transform = `scaleY(${p})`;
    };
    const remeasure = () => setRatios(measure());

    update();
    remeasure();
    const ro = new ResizeObserver(remeasure);
    ro.observe(document.body);
    const late = window.setTimeout(remeasure, 1200);
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", remeasure);
    window.addEventListener("load", remeasure);
    return () => {
      ro.disconnect();
      window.clearTimeout(late);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", remeasure);
      window.removeEventListener("load", remeasure);
    };
  }, []);

  useEffect(() => {
    if (!ready || !root.current) return;
    gsap.fromTo(root.current, { opacity: 0 }, { opacity: 1, duration: 1.2, ease: "expo.out", delay: 0.6 });
  }, [ready]);

  return (
    <nav
      ref={root}
      aria-label="Chapters"
      className="fixed right-[6px] top-1/2 z-[55] h-[44vh] w-4 -translate-y-1/2 opacity-0 md:right-3"
    >
      <div className="absolute right-[7px] top-0 h-full w-px bg-hairline-strong" />
      <div
        ref={fill}
        className="absolute right-[7px] top-0 h-full w-px origin-top bg-accent/70"
        style={{ transform: "scaleY(0)" }}
      />
      {CHAPTERS.map((c, i) => {
        const active = c.id === chapter;
        return (
          <a
            key={c.id}
            href={`#${c.id}`}
            aria-label={`Go to ${c.label}`}
            aria-current={active ? "location" : undefined}
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget(`#${c.id}`);
            }}
            className="group absolute right-0 flex h-6 w-6 -translate-y-1/2 items-center justify-end max-md:pointer-events-none"
            style={{ top: `${ratios[i] * 100}%` }}
          >
            <span className="label pointer-events-none absolute right-7 whitespace-nowrap opacity-0 transition-opacity duration-300 group-hover:opacity-100 group-focus-visible:opacity-100 max-md:hidden">
              <span className="text-accent">{c.index}</span> {c.label}
            </span>
            <span
              className={`block h-px transition-[width,background-color] duration-500 ease-out-expo ${
                active ? "w-4 bg-accent" : "w-2 bg-faint group-hover:w-3 group-hover:bg-muted"
              }`}
            />
          </a>
        );
      })}
    </nav>
  );
}
