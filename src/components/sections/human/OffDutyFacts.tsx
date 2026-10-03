"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { profile } from "@/content";
import { gsap, prefersReducedMotion } from "@/lib/motion";

const PURI_COUNT = 7;
/** The six facts that say the most about the person, in reading order. Values come from content. */
const KEEP = ["Games", "Past life", "Desk", "Reading", "Eats", "From"];
const FACTS = KEEP.flatMap((label) => profile.offDuty.filter((f) => f.label === label));
const ROW = "grid grid-cols-[6rem_1fr] items-baseline gap-x-4 border-t border-hairline py-4 md:grid-cols-[7rem_1fr]";
const VALUE = "text-[clamp(1.0625rem,1.5vw,1.3125rem)] leading-[1.25] tracking-[-0.02em] text-ink [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]";

/** Hover, focus or tap the dish and the plate count ticks up. */
function EatsValue({ value }: { value: string }) {
  const [count, setCount] = useState(0);
  const [shown, setShown] = useState(false);
  const tween = useRef<gsap.core.Tween | null>(null);

  useEffect(() => () => void tween.current?.kill(), []);

  const play = () => {
    tween.current?.kill();
    setShown(true);
    if (prefersReducedMotion()) {
      setCount(PURI_COUNT);
      return;
    }
    const counter = { n: 0 };
    setCount(0);
    tween.current = gsap.to(counter, {
      n: PURI_COUNT,
      duration: 0.75,
      ease: "power1.in",
      onUpdate: () => setCount(Math.round(counter.n)),
    });
  };
  const hide = () => setShown(false);

  return (
    <div>
      <button
        type="button"
        onPointerEnter={play}
        onPointerLeave={hide}
        onFocus={play}
        onBlur={hide}
        onClick={play}
        aria-describedby="puri-readout"
        className={`${VALUE} block cursor-default text-left`}
      >
        {value}
      </button>
      <p
        id="puri-readout"
        role="status"
        aria-live="polite"
        className={`label mt-2 h-[1.4em] transition-opacity duration-300 ${shown ? "opacity-100" : "opacity-0"}`}
      >
        {shown && (
          <>
            Puris eaten today: <span className="num text-accent-hot">{count}</span>
          </>
        )}
      </p>
    </div>
  );
}

function renderValue(label: string, value: string): ReactNode {
  if (label === "Eats") return <EatsValue value={value} />;
  return <span className={VALUE}>{value}</span>;
}

export function OffDutyFacts() {
  return (
    <dl className="border-b border-hairline">
      {FACTS.map((fact) => (
        <div key={fact.label} className={ROW}>
          <dt className="label">{fact.label}</dt>
          <dd>
            {renderValue(fact.label, fact.value)}
          </dd>
        </div>
      ))}
    </dl>
  );
}
