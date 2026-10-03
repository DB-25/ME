"use client";

import "./work.css";
import "../sections/fade.css";
import { useEffect, useRef, useState } from "react";
import { projects } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FeaturedIndex } from "./FeaturedIndex";
import { LabTable } from "./LabTable";
import { pad } from "./meta";

const SPOTLIGHT_EVENT = "director:spotlight";
const RELEASE_EVENT = "director:release";
const SPOTLIGHT_MS = 6000;

const featured = projects.filter((p) => p.featured);
const lab = projects.filter((p) => !p.featured);

export function WorkIndex() {
  const [spotlight, setSpotlight] = useState<string | null>(null);
  const timer = useRef<number>(0);

  // The AI Director can pick a project for ~6s. A new pick replaces the old one.
  useEffect(() => {
    const clear = () => {
      window.clearTimeout(timer.current);
      setSpotlight(null);
    };
    const onSpot = (e: Event) => {
      const slug = (e as CustomEvent<{ slug?: string }>).detail?.slug;
      if (!slug || !projects.some((p) => p.slug === slug)) return;
      window.clearTimeout(timer.current);
      setSpotlight(slug);
      timer.current = window.setTimeout(clear, SPOTLIGHT_MS);
    };
    window.addEventListener(SPOTLIGHT_EVENT, onSpot);
    window.addEventListener(RELEASE_EVENT, clear);
    return () => {
      window.removeEventListener(SPOTLIGHT_EVENT, onSpot);
      window.removeEventListener(RELEASE_EVENT, clear);
      window.clearTimeout(timer.current);
    };
  }, []);

  const picked = projects.find((p) => p.slug === spotlight);
  const featuredPick = featured.some((p) => p.slug === spotlight) ? spotlight : null;
  const labPick = lab.some((p) => p.slug === spotlight) ? spotlight : null;

  return (
    <section id="work" data-chapter="work" aria-labelledby="work-heading" className="wk sx-in relative">
      <div className="sx-out pb-[clamp(64px,8vw,120px)] pt-[clamp(48px,5.5vw,80px)]">
        <div className="shell">
          <div className="flex items-baseline justify-between">
            <SectionLabel chapter="work" />
            <p className="label num">{pad(featured.length)} selected</p>
          </div>
          <div className="grid-12 mt-5 items-end gap-y-5 md:mt-7">
            <h2 id="work-heading" className="col-span-12 lg:col-span-7">
              <Reveal as="span" className="display block text-[clamp(2.75rem,7vw,6.5rem)]">
                Selected work
              </Reveal>
            </h2>
            <div className="col-span-12 lg:col-span-5 lg:pb-3">
              <Reveal mode="fade" delay={0.1}>
                <p className="lede max-w-[42ch]">
                  Production systems, one hackathon podium, a tool on npm and the app where it started. Each one opens into a full case study with the
                  problem, the architecture and the receipts.
                </p>
              </Reveal>
            </div>
          </div>
        </div>

        <div className="shell mt-[clamp(28px,3.6vw,52px)]">
          <FeaturedIndex projects={featured} spotlight={featuredPick} />
        </div>

        <div className="shell mt-[clamp(64px,8vw,120px)]" aria-labelledby="lab-heading">
          <div className="grid-12 items-end gap-y-6">
            <div className="col-span-12 lg:col-span-7">
              <p className="label">The lab</p>
              <h3 id="lab-heading" className="mt-6">
                <Reveal as="span" className="headline block">
                  Everything else
                </Reveal>
              </h3>
            </div>
            <div className="col-span-12 lg:col-span-5 lg:pb-2">
              <Reveal mode="fade">
                <p className="lede max-w-[40ch]">Shared infrastructure, tooling, mobile work and experiments. Smaller in scope, same habits.</p>
              </Reveal>
            </div>
          </div>
          <div className="mt-10 md:mt-14">
            <LabTable projects={lab} offset={featured.length} spotlight={labPick} />
          </div>
        </div>

        <p className="sr-only" aria-live="polite">
          {picked ? `Director's pick: ${picked.name}` : ""}
        </p>
      </div>
    </section>
  );
}
