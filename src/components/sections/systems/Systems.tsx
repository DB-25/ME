"use client";

import { useRef } from "react";
import { usePinnedMode } from "../origin/usePinnedMode";
import { Pipeline } from "./Pipeline";
import { Principles } from "./Principles";
import { StackIndex } from "./StackIndex";
import { SystemsHeader } from "./SystemsHeader";
import { PIPELINE_SOURCE } from "./stages";

/** Scroll distance spent walking the five stages, in viewport heights. */
const PIN_VH = 190;

/** 02 / Systems. The pipeline lights up stage by stage, then the principles and the stack. */
export function Systems() {
  const pinned = usePinnedMode();
  const track = useRef<HTMLDivElement>(null);

  return (
    <section id="systems" data-chapter="systems" aria-labelledby="systems-title" className="relative">
      {pinned ? (
        <div ref={track} style={{ height: `calc(100svh + ${PIN_VH}svh)` }}>
          <div className="sticky top-0 h-svh overflow-clip">
            <div
              className="shell flex h-full flex-col justify-between pb-[max(20px,3.2svh)] pt-[84px]"
              style={{ "--layer-gap": "min(27svh, 19.5vw)" } as React.CSSProperties}
            >
              <SystemsHeader compact />
              <Pipeline track={track} />
            </div>
          </div>
        </div>
      ) : (
        <div className="shell py-[clamp(88px,12vw,180px)]">
          <SystemsHeader />
          <div className="mt-12 md:mt-24">
            <Pipeline />
            <p className="mt-8 max-w-[40rem] text-[0.9375rem] leading-[1.55] text-ink/70 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
              {PIPELINE_SOURCE.flow}
            </p>
          </div>
        </div>
      )}

      <div className="shell flex flex-col gap-[clamp(88px,12vw,180px)] pb-[clamp(96px,14vw,220px)] pt-[clamp(32px,6vw,96px)]">
        <Principles />
        <StackIndex />
      </div>
    </section>
  );
}
