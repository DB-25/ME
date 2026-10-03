"use client";

import { useEffect, useState } from "react";

/** Fine pointer, real hover, wide enough, motion allowed: the only case where the cursor-follow preview runs. */
export const DESKTOP_HOVER_QUERY =
  "(hover: hover) and (pointer: fine) and (min-width: 768px) and (prefers-reduced-motion: no-preference)";

export function useDesktopHover(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(DESKTOP_HOVER_QUERY);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return on;
}
