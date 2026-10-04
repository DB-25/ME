"use client";

import { useRef } from "react";
import { profile } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Chars } from "./Chars";
import { HeroEyebrow, HeroLinks, HeroLocation, HeroProof } from "./HeroMeta";
import { useHeroMotion } from "./useHeroMotion";

const EMPHASIZED = "end to end";
const [FIRST, ...REST] = profile.name.split(" ");
const LAST = REST.join(" ");
const EMPLOYER = profile.employer.split(", ");

/** Splits the one-liner around the serif-italic phrase, if the copy still contains it. */
function Lede({ text }: { text: string }) {
  const i = text.indexOf(EMPHASIZED);
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="text-[1.12em]"><Emph>{EMPHASIZED}</Emph></span>
      {text.slice(i + EMPHASIZED.length)}
    </>
  );
}

/**
 * Layout notes: the signal band crosses the vertical middle and is brightest on the
 * right, so small text lives top-right (title) and bottom-left (story, proof, links).
 * Nothing small sits in the right-middle.
 */
const CSS = `
#hero .hero-first { font-size: 23vw; }
#hero .hero-last { font-size: 15.5vw; }
#hero [data-out] { text-shadow: 0 0 14px rgb(6 5 9 / 0.9), 0 0 4px rgb(6 5 9 / 0.8); }
@media (min-width: 768px) {
  #hero .hero-first { font-size: clamp(4.5rem, 12.5vw, 14rem); }
  #hero .hero-last { font-size: clamp(3rem, 8.4vw, 10rem); }
}
#hero .hero-cta {
  display: inline-flex; align-items: center; gap: 0.3em; min-height: 40px; padding-inline: 2px;
  font-size: 13.5px; font-weight: 500; color: var(--color-muted);
  transition: color 0.25s;
}
#hero .hero-cta-text {
  text-decoration: underline; text-decoration-thickness: 1px; text-underline-offset: 6px;
  text-decoration-color: rgb(238 234 246 / 0.28); transition: text-decoration-color 0.25s;
}
#hero .hero-btn {
  display: inline-flex; align-items: center; justify-content: center; gap: 0.5em; min-height: 44px; padding-inline: 18px;
  border: 1px solid rgb(238 234 246 / 0.38); border-radius: 2px; text-shadow: none;
  font-size: 14px; font-weight: 500; color: var(--color-ink);
  transition: color 0.25s, background-color 0.25s, border-color 0.25s;
}
#hero .hero-btn-solid { background: var(--color-ink); border-color: var(--color-ink); color: var(--color-void); }
#hero .hero-btn:hover { border-color: var(--color-accent-hot); color: var(--color-accent-hot); }
#hero .hero-btn-solid:hover { background: var(--color-accent-hot); color: var(--color-void); }
#hero .hero-btn-arrow { transition: transform 0.35s var(--ease-out-expo); }
#hero .hero-btn:hover .hero-btn-arrow { transform: translate(2px, 2px); }
#hero .hero-btn:not(.hero-btn-solid) .hero-btn-arrow { color: var(--color-accent-hot); }
#hero .hero-btn:not(.hero-btn-solid):hover .hero-btn-arrow { transform: translate(2px, -2px); }
#hero .hero-cta:hover { color: var(--color-accent-hot); }
#hero .hero-cta:hover .hero-cta-text { text-decoration-color: var(--color-accent-hot); }
#hero .hero-cta-arrow { color: var(--color-accent-hot); transition: transform 0.35s var(--ease-out-expo); }
#hero .hero-cta:hover .hero-cta-arrow { transform: translate(2px, -2px); }
@media (min-width: 768px) { #hero .hero-cta { min-height: 32px; font-size: 14px; } #hero .hero-btn { min-height: 40px; } }
/* The story, proof and links can sit over bright particles (noise phase, band edge): soft scrim. */
#hero .hero-stack { position: relative; isolation: isolate; }
#hero .hero-stack::before {
  content: ""; position: absolute; z-index: -1; inset: -40px -16px -16px;
  background: linear-gradient(to top, rgb(6 5 9 / 0.9) 62%, transparent);
}
@media (min-width: 1024px) {
  #hero .hero-stack::before {
    inset: -90px -120px -40px -60px;
    background: radial-gradient(ellipse at 20% 75%, rgb(6 5 9 / 0.88) 0%, rgb(6 5 9 / 0.7) 45%, transparent 75%);
  }
}
`;

export function Hero() {
  const root = useRef<HTMLElement>(null);
  useHeroMotion(root);

  return (
    <section
      ref={root}
      id="hero"
      data-chapter="hero"
      aria-labelledby="hero-title"
      className="relative h-svh"
    >
      <style>{CSS}</style>

      <div className="sticky top-0 h-svh overflow-clip">
        <h1 id="hero-title" className="sr-only">
          {profile.name}, {profile.title}
        </h1>

        <div className="shell relative flex h-full flex-col justify-start gap-4 pb-[max(var(--gutter),env(safe-area-inset-bottom))] pt-[72px] md:justify-between md:gap-0 md:pb-8 md:pt-[76px]">
          {/* Registration marks frame the stage, the way a title card is framed. */}
          {(["left-[var(--gutter)] top-[68px]", "right-[var(--gutter)] top-[68px]", "left-[var(--gutter)] bottom-3", "right-[var(--gutter)] bottom-3"] as const).map((pos) => (
            <span key={pos} aria-hidden className={`absolute hidden h-[9px] w-[9px] md:block ${pos}`}>
              <span className="absolute left-1/2 top-0 h-full w-px bg-faint" />
              <span className="absolute left-0 top-1/2 h-px w-full bg-faint" />
            </span>
          ))}

          {/* Top: title block and first name */}
          <div className="flex flex-col items-start gap-2 md:flex-row md:justify-between md:gap-8">
            <div aria-hidden data-line="first" className="hero-first display order-2 text-ink will-change-transform md:order-1">
              <Chars text={FIRST} />
            </div>
            <div data-out className="order-1 md:order-2 md:pt-3 md:text-right">
              <p className="label !text-[12px] !text-ink">{profile.title}</p>
              <p className="label mt-1">
                {EMPLOYER.map((line) => (
                  <span key={line} className="block">
                    {line}
                  </span>
                ))}
              </p>
              <HeroLocation />
            </div>
          </div>

          {/* Bottom: story, proof and links, with the last name */}
          <div className="flex flex-col gap-4 max-md:-mt-3 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
            <div data-out className="hero-stack order-2 flex w-full max-w-[30rem] flex-col gap-4 lg:order-1 lg:w-[32vw] lg:gap-5">
              <div className="flex flex-col gap-2">
                <HeroEyebrow />
                <p className="text-[1.0625rem] leading-[1.35] text-ink md:text-[1.25rem]">
                  <Lede text={profile.oneLiner} />
                </p>
              </div>
              <HeroProof />
              <HeroLinks />
            </div>

            <div aria-hidden data-line="last" className="hero-last display relative z-[1] order-1 self-end text-right text-ink will-change-transform lg:order-2">
              <Chars text={LAST} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
