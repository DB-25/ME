"use client";

import { useState } from "react";
import { ScrollTrigger, scrollToTarget } from "@/lib/motion";
import { AimTrainer } from "./AimTrainer";

/** Clear space the fixed top bar and the phone contact bar take, so a centred drill is never half hidden. */
const TOP_CLEAR = 72;
const BOTTOM_CLEAR = 72;

const BTN =
  "label inline-flex w-fit items-center gap-3 border border-valorant/60 px-5 py-3 !text-ink transition-colors duration-300 hover:border-valorant hover:!text-valorant focus-visible:border-valorant";

/** The aim drill stays out of the way until asked for. The arena mounts on first open. */
export function AimDisclosure() {
  const [open, setOpen] = useState(false);

  /** The drill opens below the fold on most screens: bring the whole arena into view, button and all. */
  const reveal = () => {
    const drill = document.getElementById("aim-drill");
    if (!drill) return;
    const { top, height } = drill.getBoundingClientRect();
    const room = window.innerHeight - TOP_CLEAR - BOTTOM_CLEAR;
    if (top >= TOP_CLEAR && top + height <= window.innerHeight - BOTTOM_CLEAR) return;
    scrollToTarget(drill, -(TOP_CLEAR + Math.max(0, (room - height) / 2)));
  };

  const toggle = () => {
    const opening = !open;
    setOpen(opening);
    requestAnimationFrame(() => {
      ScrollTrigger.refresh();
      if (opening) requestAnimationFrame(reveal);
    });
  };

  return (
    <div>
      <button type="button" aria-expanded={open} aria-controls="aim-drill" onClick={toggle} className={BTN}>
        <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-valorant" />
        {open ? "Hide the aim drill" : "Play the aim drill"}
      </button>
      <div id="aim-drill" hidden={!open} className="mt-6 md:max-w-[min(34rem,42vw)]">
        {open && <AimTrainer />}
      </div>
    </div>
  );
}
