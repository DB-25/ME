"use client";

import { useEffect, useState } from "react";

const PIN_QUERY = "(min-width: 768px) and (min-height: 600px) and (prefers-reduced-motion: no-preference)";

/**
 * True when a chapter should pin and scrub. The server and the first client
 * render are always `false`, so the unpinned, fully readable layout is what
 * ships without JavaScript, on phones and with reduced motion.
 */
export function usePinnedMode(): boolean {
  const [pinned, setPinned] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(PIN_QUERY);
    const update = () => setPinned(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return pinned;
}
