"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { profile } from "@/content";
import { gsap, prefersReducedMotion } from "@/lib/motion";

const PURI_COUNT = 7;
const ROW = "grid grid-cols-[6.5rem_1fr] items-baseline gap-x-4 border-t border-hairline py-4 md:grid-cols-[7.5rem_1fr] md:py-4";
const VALUE = "text-[clamp(1.125rem,1.7vw,1.5rem)] leading-[1.2] tracking-[-0.02em] text-ink";

/** Black and purple, with a coin that flips when you point at the words. */
function ColorsValue({ value }: { value: string }) {
  const [black, rest] = value.split(" and ");
  return (
    <span className={`group/colors inline-flex cursor-default items-center gap-3 ${VALUE}`}>
      <span aria-hidden className="relative inline-block h-[18px] w-[18px] [perspective:120px]">
        <span className="absolute inset-0 transition-transform duration-[600ms] ease-[var(--ease-out-expo)] [transform-style:preserve-3d] group-hover/colors:[transform:rotateY(180deg)]">
          <span className="absolute inset-0 border border-ink/40 bg-void [backface-visibility:hidden]" />
          <span className="absolute inset-0 bg-accent [backface-visibility:hidden] [transform:rotateY(180deg)]" />
        </span>
      </span>
      <span>
        <span className="transition-colors duration-300 group-hover/colors:text-muted">{black}</span>
        {" and "}
        <span className="transition-colors duration-300 group-hover/colors:text-accent-hot">{rest}</span>
      </span>
    </span>
  );
}

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
  if (label === "Colors") return <ColorsValue value={value} />;
  if (label === "Eats") return <EatsValue value={value} />;
  return <span className={VALUE}>{value}</span>;
}

export function OffDutyFacts() {
  return (
    <dl className="border-b border-hairline">
      {profile.offDuty.map((fact) => (
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
