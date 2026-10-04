"use client";

import { useEffect, useRef } from "react";
import { gsap, ScrollTrigger, EASE_OUT } from "@/lib/motion";
import { BEATS, CITIES, digitCells, digitTravel } from "./beats";
import { OriginHeader } from "./OriginHeader";
import { Scrim } from "../Scrim";
import { YearRoll } from "./YearRoll";

/** Scroll distance owned by each beat, in viewport heights. */
const VH_PER_BEAT = 14;
/** Share of the pinned scroll that walks the beats; the tail fades the whole stage out before Systems arrives. */
const BEAT_SHARE = 0.9;
const N = BEATS.length;
const TRACK_VH = Math.round((N * VH_PER_BEAT) / BEAT_SHARE);
const TRAVEL = digitTravel(BEATS);
const CELLS = digitCells(TRAVEL);

/** Pinned scrollytelling: the stage sticks, scroll advances one beat at a time. */
export function PinnedJourney() {
  const track = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = track.current;
    if (!root) return;

    const ctx = gsap.context(() => {
      const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");
      const strips = gsap.utils.toArray<HTMLElement>("[data-strip]");
      const ticks = gsap.utils.toArray<HTMLElement>("[data-tick]");
      const fill = root.querySelector<HTMLElement>("[data-fill]");
      const stage = root.querySelector<HTMLElement>("[data-stage]");
      const coords = gsap.utils.toArray<HTMLElement>("[data-city]");
      let current = -1;
      strips.forEach((strip) => gsap.set(strip, { yPercent: Number(strip.dataset.start) }));

      const show = (next: number) => {
        const prev = current;
        current = next;
        const dir = next >= prev ? 1 : -1;
        if (prev >= 0) {
          gsap.to(panels[prev], { autoAlpha: 0, y: -24 * dir, duration: 0.35, ease: "power2.out", overwrite: true });
        }
        const parts = panels[next].querySelectorAll("[data-part]");
        gsap.set(panels[next], { y: 0 });
        gsap.fromTo(
          panels[next],
          { autoAlpha: 0 },
          { autoAlpha: 1, duration: 0.5, delay: prev >= 0 ? 0.2 : 0, overwrite: true },
        );
        gsap.fromTo(
          parts,
          { y: 36 * dir, opacity: 0 },
          { y: 0, opacity: 1, duration: 1.1, ease: EASE_OUT, stagger: 0.07, delay: prev >= 0 ? 0.2 : 0, overwrite: true },
        );
        strips.forEach((strip, pos) => {
          gsap.to(strip, {
            yPercent: (-TRAVEL[pos][next] / CELLS[pos]) * 100,
            duration: 1.4,
            ease: "expo.inOut",
            delay: (3 - pos) * 0.05,
            overwrite: true,
          });
        });
        ticks.forEach((t, i) => {
          t.dataset.state = i === next ? "active" : i < next ? "past" : "next";
        });
        const city = CITIES[BEATS[next].city];
        if (fill) fill.style.backgroundColor = city.bg;
        coords.forEach((c) => {
          c.dataset.state = c.dataset.city === BEATS[next].city ? "active" : "idle";
        });
      };

      show(0);
      ScrollTrigger.create({
        trigger: root,
        start: "top top",
        end: "bottom bottom",
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          const p = Math.min(1, self.progress / BEAT_SHARE);
          if (fill) fill.style.transform = `scaleX(${Math.min(1, (p * N) / (N - 1))})`;
          const i = Math.min(N - 1, Math.floor(p * N));
          if (i !== current) show(i);
          // The pin ends in a fade, so the year axis never bleeds into the next chapter.
          if (stage) stage.style.opacity = String(1 - gsap.utils.clamp(0, 1, (self.progress - BEAT_SHARE) / (1 - BEAT_SHARE)));
        },
      });
    }, root);

    // The chapter swaps layout after hydration, so positions need one fresh measure.
    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());
    return () => {
      cancelAnimationFrame(raf);
      ctx.revert();
      requestAnimationFrame(() => ScrollTrigger.refresh());
    };
  }, []);

  const jump = (i: number) => {
    const el = track.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top + window.scrollY;
    const span = el.offsetHeight - window.innerHeight;
    const y = top + ((i + 0.5) / N) * span * BEAT_SHARE;
    const lenis = (window as unknown as { lenis?: { scrollTo: (y: number, o?: object) => void } }).lenis;
    if (lenis) lenis.scrollTo(y, { duration: 1.4 });
    else window.scrollTo({ top: y, behavior: "smooth" });
  };

  return (
    <div ref={track} style={{ height: `calc(100svh + ${TRACK_VH}svh)` }}>
      {/* Screen readers get the whole journey as a list; the stage is the visual layer. */}
      <ol className="sr-only">
        {BEATS.map((b) => (
          <li key={b.id}>
            {b.year}, {b.place}. {b.title}
            {b.org ? `, ${b.org}` : ""}. {b.body}
          </li>
        ))}
      </ol>

      <div data-stage className="sticky top-0 h-svh overflow-clip">
        <div className="shell grid h-full grid-rows-[auto_1fr_auto] pb-7 pt-[84px]">
          <OriginHeader />

          <div className="flex min-h-0 flex-col justify-end gap-[min(3.2svh,28px)] pb-[min(4svh,36px)]">
            <YearRoll />

            <div aria-hidden className="grid-12 items-start">
              <div className="relative col-span-12 grid min-h-[min(25svh,200px)] md:col-span-6">
                <Scrim shape="left" strength={0.8} inset="-12% -8% -12% -24px" />
                {BEATS.map((b) => {
                  const city = CITIES[b.city];
                  return (
                    <div key={b.id} data-panel className="invisible col-start-1 row-start-1 grid grid-cols-6 gap-x-[var(--gutter)]">
                      <div className="col-span-3">
                        <p data-part className={`label !text-[12px] ${city.label}`}>
                          {b.place}
                        </p>
                        <p data-part className="mt-3 text-[clamp(1.35rem,2.1vw,2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-ink">
                          {b.title}
                        </p>
                        {b.org && (
                          <p data-part className="label mt-3">
                            {b.org}
                          </p>
                        )}
                      </div>
                      <p data-part className="col-span-3 max-w-[30rem] pt-[1.55rem] text-[clamp(0.9375rem,1.15vw,1.0625rem)] leading-[1.55] text-ink/80 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
                        {b.body}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* The rail is the journey: Bangalore at one end, Boston at the other, one tick per beat. */}
          <div aria-hidden>
            <div className="mb-3 flex justify-between">
              {(["bangalore", "boston"] as const).map((id) => (
                <p
                  key={id}
                  data-city={id}
                  className="label transition-colors duration-500 data-[state=active]:!text-ink"
                >
                  <span className={CITIES[id].text}>{CITIES[id].name}</span>
                  <span className="ml-3">{CITIES[id].coords}</span>
                </p>
              ))}
            </div>
            <div className="relative h-px bg-hairline-strong">
              <div
                data-fill
                className="absolute inset-0 origin-left bg-saffron transition-colors duration-700"
                style={{ transform: "scaleX(0)" }}
              />
              {BEATS.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  tabIndex={-1}
                  data-tick
                  data-state="next"
                  onClick={() => jump(i)}
                  className="group absolute top-0 h-[34px] outline-none"
                  style={{
                    left: `${(i / (N - 1)) * 100}%`,
                    transform: `translateX(${i === 0 ? "0" : i === N - 1 ? "-100%" : "-50%"})`,
                  }}
                >
                  <span className={`absolute -top-[7px] block h-[7px] w-px ${i === 0 ? "left-0" : i === N - 1 ? "right-0" : "left-1/2"} bg-faint transition-colors group-data-[state=active]:bg-ink group-data-[state=past]:bg-muted`} />
                  <span className="label num block pt-3 !text-dim transition-colors group-hover:!text-ink group-data-[state=active]:!text-ink group-data-[state=past]:!text-muted">
                    {b.year}
                  </span>
                </button>
              ))}
            </div>
            <div className="h-[34px]" />
          </div>
        </div>
      </div>
    </div>
  );
}
