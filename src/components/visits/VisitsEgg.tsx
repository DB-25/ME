"use client";

import dynamic from "next/dynamic";
import { useEffect } from "react";
import { isOnGlobe } from "@/components/signal/globeHit";
import { useVisitsOpen } from "./useVisits";
import { VISITS_CLOSE_EVENT, getVisitsState, openVisits, startVisits } from "./visitsClient";

/** Everything visual (the overlay, the map, the demo data) loads on the first open, never with the page. */
const VisitsOverlay = dynamic(() => import("./VisitsOverlay"), { ssr: false });

const EDITABLE = /^(INPUT|TEXTAREA|SELECT)$/;
const INTERACTIVE = "a, button, input, textarea, select, summary, label, [role='button'], [data-no-egg]";

/**
 * The hidden visitors globe. Mounted once in the layout: it counts the visit and probes the Worker after idle, then
 * waits for a trigger (`v`, a click on the About chapter's globe, or the footer hint). Until the Worker has
 * answered with a real map it does nothing at all, and nothing about it is visible.
 */
export function VisitsEgg() {
  const open = useVisitsOpen();

  useEffect(() => startVisits(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "v" || e.metaKey || e.ctrlKey || e.altKey || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || EDITABLE.test(t.tagName))) return;
      if (document.querySelector("dialog[open]")) return;
      if (getVisitsState().open) window.dispatchEvent(new Event(VISITS_CLOSE_EVENT));
      else openVisits();
    };
    const onClick = (e: MouseEvent) => {
      if (getVisitsState().status !== "ready" || !isOnGlobe(e.clientX, e.clientY)) return;
      if ((e.target as HTMLElement | null)?.closest(INTERACTIVE)) return;
      openVisits();
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, []);

  return open ? <VisitsOverlay /> : null;
}
