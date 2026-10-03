"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ScrollTrigger } from "@/lib/motion";
import { fieldMotion } from "@/components/signal/readingMode";

/** While this block is on screen the particle network ducks, so no line runs through the copy. */
export function ReadingZone({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const trigger = ScrollTrigger.create({
      trigger: el,
      start: "top 90%",
      end: "bottom 10%",
      onToggle: (self) => {
        fieldMotion.duck = self.isActive ? 1 : 0;
      },
    });
    return () => {
      trigger.kill();
      fieldMotion.duck = 0;
    };
  }, []);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
