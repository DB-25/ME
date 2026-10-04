"use client";

import { useState } from "react";
import { ScrollTrigger } from "@/lib/motion";
import { AimTrainer } from "./AimTrainer";

const BTN =
  "label inline-flex w-fit items-center gap-3 border border-valorant/60 px-5 py-3 !text-ink transition-colors duration-300 hover:border-valorant hover:!text-valorant focus-visible:border-valorant";

/** The aim drill stays out of the way until asked for. The arena mounts on first open. */
export function AimDisclosure() {
  const [open, setOpen] = useState(false);

  const toggle = () => {
    setOpen((v) => !v);
    requestAnimationFrame(() => ScrollTrigger.refresh());
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
