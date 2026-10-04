"use client";

import { useEffect, type RefObject } from "react";
import { setGlobeStory } from "@/components/signal/globeStory";
import { BEATS } from "./beats";

/** What the particle globe should do for a beat: face that beat's city, and draw the arc once the move has happened. */
export function tellGlobe(beat: number) {
  const city = BEATS[beat].city;
  setGlobeStory({ focus: city, arc: city === "boston" });
}

/**
 * Unpinned layout (phones, reduced motion): the beat is the list item crossing a thin band near the middle
 * of the viewport. The story starts at the first beat and ends with the component.
 */
export function useGlobeStoryFromList(list: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const items = list.current ? Array.from(list.current.children) : [];
    tellGlobe(0);
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) tellGlobe(items.indexOf(e.target));
      },
      { rootMargin: "-42% 0px -48% 0px" },
    );
    items.forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      setGlobeStory(null);
    };
  }, [list]);
}
