"use client";

import { useRef, useEffect, useState } from "react";
import { timeline } from "@/data/timeline";
import { RevealText } from "@/components/ui/RevealText";
import { TimelineChapter } from "./TimelineChapter";

function useScrollProgress(ref: React.RefObject<HTMLElement | null>) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const onScroll = () => {
      const rect = el.getBoundingClientRect();
      const viewH = window.innerHeight;
      // progress: 0 when top enters viewport, 1 when bottom leaves
      const total = rect.height + viewH;
      const scrolled = viewH - rect.top;
      setProgress(Math.max(0, Math.min(1, scrolled / total)));
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, [ref]);

  return progress;
}

export function JourneySection() {
  const timelineRef = useRef<HTMLDivElement>(null);
  const progress = useScrollProgress(timelineRef);

  return (
    <section id="journey" className="section relative py-24 md:py-32">
      {/* Section heading */}
      <RevealText direction="up">
        <div className="mb-16 md:mb-24">
          <h2 className="text-h2 text-[var(--text-primary)]">The road so far</h2>
        </div>
      </RevealText>

      {/* Timeline */}
      <div className="relative" ref={timelineRef}>
        {/* Vertical glowing line — hidden on mobile, visible md+ */}
        <div className="hidden md:block absolute left-1/2 top-0 bottom-0 -translate-x-1/2">
          <svg
            className="w-[2px] h-full"
            preserveAspectRatio="none"
            viewBox="0 0 2 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              <linearGradient
                id="timeline-glow"
                x1="1"
                y1="0"
                x2="1"
                y2="100"
                gradientUnits="userSpaceOnUse"
              >
                <stop offset="0%" stopColor="var(--accent)" stopOpacity="0" />
                <stop offset="15%" stopColor="var(--accent-warm)" stopOpacity="1" />
                <stop
                  offset="85%"
                  stopColor="var(--accent-warm-light)"
                  stopOpacity="1"
                />
                <stop
                  offset="100%"
                  stopColor="var(--accent-warm-light)"
                  stopOpacity="0"
                />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {/* Background track */}
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="100"
              stroke="var(--bg-border)"
              strokeWidth="2"
            />
            {/* Animated fill line — stroke-dashoffset driven by scroll */}
            <line
              x1="1"
              y1="0"
              x2="1"
              y2="100"
              stroke="url(#timeline-glow)"
              strokeWidth="2"
              filter="url(#glow)"
              strokeDasharray="100"
              strokeDashoffset={100 - progress * 100}
              style={{ transition: "stroke-dashoffset 0.1s linear" }}
            />
          </svg>
        </div>

        {/* Mobile line — also scroll-driven */}
        <div
          className="md:hidden absolute left-6 top-0 w-[2px] opacity-40"
          style={{
            background: `linear-gradient(to bottom, transparent, var(--accent-warm), transparent)`,
            height: `${progress * 100}%`,
            transition: "height 0.1s linear",
          }}
        />

        {/* Chapters */}
        <div className="flex flex-col gap-12 md:gap-16">
          {timeline.map((milestone, index) => {
            const isEven = index % 2 === 0;

            return (
              <div
                key={milestone.id}
                className="relative flex items-start md:items-center"
              >
                {/* Desktop: alternating layout */}
                <div className="hidden md:grid md:grid-cols-[1fr_auto_1fr] md:gap-8 w-full items-center">
                  {/* Left column */}
                  <div
                    className={
                      isEven ? "flex justify-end" : "flex justify-end opacity-0"
                    }
                  >
                    {isEven && (
                      <TimelineChapter milestone={milestone} index={index} />
                    )}
                  </div>

                  {/* Center dot */}
                  <div className="relative flex items-center justify-center">
                    <div
                      className="w-4 h-4 rounded-full border-2 z-10"
                      style={{
                        borderColor:
                          milestone.accentColor ?? "var(--accent-light)",
                        backgroundColor: "var(--bg-primary)",
                        boxShadow: `0 0 12px ${milestone.accentColor ?? "var(--accent)"}60`,
                      }}
                    />
                  </div>

                  {/* Right column */}
                  <div
                    className={
                      !isEven
                        ? "flex justify-start"
                        : "flex justify-start opacity-0"
                    }
                  >
                    {!isEven && (
                      <TimelineChapter milestone={milestone} index={index} />
                    )}
                  </div>
                </div>

                {/* Mobile: stacked layout */}
                <div className="md:hidden flex items-start gap-4 w-full pl-2">
                  {/* Dot */}
                  <div className="relative mt-2 flex-shrink-0">
                    <div
                      className="w-3 h-3 rounded-full border-2 z-10"
                      style={{
                        borderColor:
                          milestone.accentColor ?? "var(--accent-light)",
                        backgroundColor: "var(--bg-primary)",
                        boxShadow: `0 0 8px ${milestone.accentColor ?? "var(--accent)"}60`,
                      }}
                    />
                  </div>

                  {/* Card */}
                  <div className="flex-1">
                    <TimelineChapter milestone={milestone} index={index} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
