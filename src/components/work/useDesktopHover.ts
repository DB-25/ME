"use client";

import { useEffect, useState } from "react";

/** Wide screen with a real mouse: the work index becomes a list with one large preview stage beside it. */
export const STAGE_QUERY = "(min-width: 1100px) and (hover: hover) and (pointer: fine)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function useMedia(query: string): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, [query]);
  return on;
}

export const useStageLayout = () => useMedia(STAGE_QUERY);
export const useReducedMotion = () => useMedia(REDUCED_QUERY);
