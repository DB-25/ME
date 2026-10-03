"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { STAGES } from "./stages";

const N = STAGES.length;
/** Share of the pinned scroll spent walking the stages; the rest is a dwell on the finished pipeline. */
const WALK = 0.88;

type Props = {
  /** The element whose scroll extent drives the scrub. Omit for the static layout. */
  track?: React.RefObject<HTMLElement | null>;
};

/**
 * The five-stage strip. Unpinned it is a plain, fully lit list. Pinned, scroll
 * lights the stages in sequence and a hairline fills between them. Hover or
 * focus on a stage previews it; clicking scrolls to it.
 */
export function Pipeline({ track }: Props) {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = list.current;
    const wrap = el?.parentElement;
    const trackEl = track?.current;
    if (!el || !wrap || !trackEl) return;

    const ctx = gsap.context(() => {
      const items = gsap.utils.toArray<HTMLElement>("[data-stage]", el);
      const rail = wrap.querySelector<HTMLElement>("[data-rail-fill]");
      let scrolled = 0;
      let hovered = -1;

      const paint = () => {
        const active = hovered >= 0 ? hovered : scrolled;
        items.forEach((item, i) => {
          item.dataset.state = i === active ? "active" : i < active ? "lit" : "idle";
        });
      };

      const onEnter = (i: number) => () => {
        hovered = i;
        paint();
      };
      const onLeave = () => {
        hovered = -1;
        paint();
      };
      const cleanups = items.map((item, i) => {
        const enter = onEnter(i);
        item.addEventListener("pointerenter", enter);
        item.addEventListener("focusin", enter);
        item.addEventListener("pointerleave", onLeave);
        item.addEventListener("focusout", onLeave);
        return () => {
          item.removeEventListener("pointerenter", enter);
          item.removeEventListener("focusin", enter);
          item.removeEventListener("pointerleave", onLeave);
          item.removeEventListener("focusout", onLeave);
        };
      });

      paint();
      ScrollTrigger.create({
        trigger: trackEl,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const t = Math.min(1, self.progress / WALK) * N;
          if (rail) rail.style.transform = `scaleX(${Math.min(1, t / (N - 1))})`;
          const next = Math.min(N - 1, Math.floor(t));
          if (next !== scrolled) {
            scrolled = next;
            paint();
          }
        },
      });
      return () => cleanups.forEach((c) => c());
    }, el);

    return () => ctx.revert();
  }, [track]);

  const jump = (i: number) => {
    const trackEl = track?.current;
    if (!trackEl) return;
    const top = trackEl.getBoundingClientRect().top + window.scrollY;
    const span = trackEl.offsetHeight - window.innerHeight;
    const y = top + ((i + 0.3) / N) * WALK * span;
    const lenis = (window as unknown as { lenis?: { scrollTo: (y: number, o?: object) => void } }).lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  const pinned = Boolean(track);

  return (
    <div
      className={pinned ? "relative mx-auto" : "relative"}
      style={pinned ? { width: "calc(var(--layer-gap) * 5)", maxWidth: "100%" } : undefined}
    >
      {pinned && (
        <div aria-hidden className="absolute left-[10%] top-[3px] h-px w-[80%] bg-hairline-strong">
          <span data-rail-fill className="absolute inset-0 origin-left bg-accent" style={{ transform: "scaleX(0)" }} />
        </div>
      )}
      <ol
        ref={list}
        className={
          pinned
            ? "grid grid-cols-5 text-center"
            : "grid grid-cols-1 gap-0 md:grid-cols-5 md:gap-x-[var(--gutter)]"
        }
      >
        {STAGES.map((s, i) => (
          <li
            key={s.id}
            data-stage
            className={`group/stage relative ${pinned ? "pt-7" : "border-t border-hairline py-6 md:border-t-0 md:py-0"}`}
          >
            {pinned ? (
              <span className="absolute left-1/2 top-0 block h-[7px] w-[7px] -translate-x-1/2 rounded-full bg-faint transition-colors duration-500 group-data-[state=active]/stage:bg-accent-hot group-data-[state=lit]/stage:bg-accent" />
            ) : (
              <span aria-hidden className="mb-5 hidden h-px bg-accent/60 md:block" />
            )}

            <h3 className={`flex items-baseline gap-x-3 text-[clamp(1.5rem,2.5vw,2.4rem)] font-medium leading-none tracking-[-0.04em] text-ink transition-colors duration-500 group-data-[state=idle]/stage:text-dim md:flex-col md:gap-y-2 ${pinned ? "md:items-center" : ""}`}>
              <span className="label num order-first !tracking-[0.08em] transition-colors duration-500 group-data-[state=active]/stage:!text-accent group-data-[state=lit]/stage:!text-accent">
                {String(i + 1).padStart(2, "0")}
              </span>
              {pinned ? (
                <button type="button" onClick={() => jump(i)} className="tracking-[inherit] outline-none focus-visible:underline">
                  {s.label}
                </button>
              ) : (
                s.label
              )}
            </h3>
            <p className="label mt-3 transition-colors duration-500 group-data-[state=idle]/stage:!text-dim">{s.component}</p>
            <p
              className={`mt-3 max-w-[16rem] text-[0.875rem] leading-[1.45] text-ink/70 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)] transition-[opacity,transform] duration-700 ease-[var(--ease-out-expo)] group-data-[state=idle]/stage:translate-y-2 group-data-[state=idle]/stage:opacity-0 group-data-[state=lit]/stage:translate-y-2 group-data-[state=lit]/stage:opacity-0 ${pinned ? "mx-auto" : ""}`}
            >
              {s.line}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
