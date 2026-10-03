"use client";

import { useRef } from "react";
import { profile } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Chars } from "./Chars";
import { HeroLedger, ScrollCue } from "./HeroMeta";
import { useHeroMotion } from "./useHeroMotion";

const EMPHASIZED = "actually";
const [FIRST, ...REST] = profile.name.split(" ");
const LAST = REST.join(" ");
const EMPLOYER = profile.employer.split(", ");

/** Splits the one-liner around the single serif-italic word. */
function Lede({ text }: { text: string }) {
  const i = text.indexOf(EMPHASIZED);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <Emph>{EMPHASIZED}</Emph>
      {text.slice(i + EMPHASIZED.length)}
    </>
  );
}

const CSS = `
#hero[data-intro="pending"] :is([data-ch], [data-meta], [data-mark]) { visibility: hidden; }
#hero .hero-first { font-size: 25vw; }
#hero .hero-last { font-size: 19.5vw; }
#hero [data-out] { text-shadow: 0 0 14px rgb(6 5 9 / 0.9), 0 0 4px rgb(6 5 9 / 0.8); }
@media (min-width: 768px) {
  #hero .hero-first { font-size: clamp(4.5rem, 12.5vw, 14rem); }
  #hero .hero-last { font-size: clamp(3rem, 8.4vw, 10rem); }
}
@keyframes hero-cue { 0% { transform: translateX(-100%); } 100% { transform: translateX(200%); } }
.hero-cue-sweep { animation: hero-cue 2.2s cubic-bezier(0.76, 0, 0.24, 1) infinite; }
`;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  useHeroMotion(root);

  return (
    <section
      ref={root}
      id="hero"
      data-chapter="hero"
      data-intro="pending"
      aria-labelledby="hero-title"
      className="relative h-[135svh]"
    >
      <style>{CSS}</style>
      <noscript>
        <style>{`#hero :is([data-ch], [data-meta], [data-mark]) { visibility: visible !important; }`}</style>
      </noscript>

      <div className="sticky top-0 h-svh overflow-clip">
        <h1 id="hero-title" className="sr-only">
          {profile.name}, {profile.title}
        </h1>

        <div className="shell relative flex h-full flex-col justify-between pb-[var(--gutter)] pt-[76px] md:pb-8">
          {/* Registration marks frame the stage, the way a title card is framed. */}
          {(["left-[var(--gutter)] top-[68px]", "right-[var(--gutter)] top-[68px]", "left-[var(--gutter)] bottom-3", "right-[var(--gutter)] bottom-3"] as const).map((pos) => (
            <span key={pos} data-mark aria-hidden className={`absolute hidden h-[9px] w-[9px] md:block ${pos}`}>
              <span className="absolute left-1/2 top-0 h-full w-px bg-faint" />
              <span className="absolute left-0 top-1/2 h-px w-full bg-faint" />
            </span>
          ))}

          {/* Top: first name, title block, and (on mobile) the lede */}
          <div className="flex flex-col items-start gap-3 md:flex-row md:justify-between md:gap-8">
            <div aria-hidden data-line="first" className="hero-first display order-2 text-ink will-change-transform md:order-1">
              <Chars text={FIRST} />
            </div>
            <div data-out className="order-1 md:order-2 md:pt-3 md:text-right">
              <p data-meta className="label !text-ink">
                {profile.title}
              </p>
              <p data-meta className="label mt-1">
                {EMPLOYER.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
            </div>
            <div
              data-out
              className="order-3 max-w-[22rem] md:absolute md:left-[var(--gutter)] md:top-1/2 md:w-[min(15vw,17rem)] md:-translate-y-1/2"
            >
              <span data-rule aria-hidden className="mb-4 block h-px w-10 bg-accent max-md:hidden" />
              <p data-meta className="text-[0.9375rem] leading-[1.45] text-ink/90 md:text-[1.0625rem]">
                <Lede text={profile.oneLiner} />
              </p>
            </div>
          </div>

          {/* Bottom: last name, ledger, cue */}
          <div className="flex flex-col gap-5 md:contents">
            <div aria-hidden data-line="last" className="hero-last display order-1 self-end text-right text-ink will-change-transform">
              <Chars text={LAST} />
            </div>

            <div data-out className="order-2 md:absolute md:right-[var(--gutter)] md:top-1/2 md:-translate-y-1/2">
              <HeroLedger location={profile.location} origin={profile.origin} />
            </div>

            <div data-out className="order-3 md:absolute md:bottom-8 md:left-[var(--gutter)]">
              <div data-cue data-meta>
                <ScrollCue />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
