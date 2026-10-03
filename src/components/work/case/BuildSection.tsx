"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, ScrollTrigger, prefersReducedMotion } from "@/lib/motion";
import { pad } from "../meta";
import { CaseLabel } from "./CaseLabel";

/** Numbered steps. The step nearest the reading line lights up (number turns accent, text to ink). */
export function BuildSection({ project, n }: { project: Project; n: string }) {
  const list = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const root = list.current;
    if (!root) return;
    const steps = root.querySelectorAll<HTMLElement>(".cs-step");
    if (prefersReducedMotion()) {
      steps.forEach((s) => s.classList.add("is-on"));
      return;
    }
    const ctx = gsap.context(() => {
      steps.forEach((step) => {
        gsap.from(step.querySelectorAll("[data-in]"), {
          y: 28,
          opacity: 0,
          duration: 1.1,
          ease: "expo.out",
          stagger: 0.08,
          scrollTrigger: { trigger: step, start: "top 88%", once: true },
        });
        ScrollTrigger.create({
          trigger: step,
          start: "top 62%",
          end: "bottom 38%",
          onToggle: (self) => step.classList.toggle("is-on", self.isActive),
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  return (
    <section className="cs-section" data-cs="build" data-cs-label="What I built" aria-labelledby="cs-build">
      <div className="shell grid-12 cs-split">
        <div className="col-span-12 md:col-span-4">
          <div className="cs-sticky">
            <CaseLabel n={n} text="What I built" />
            <h2 id="cs-build" className="headline cs-h2 mt-6">
              <Reveal as="span" className="block">
                What I built
              </Reveal>
            </h2>
          </div>
        </div>
        <ol ref={list} className="cs-steps col-span-12 md:col-span-8">
          {project.approach.map((step, i) => (
            <li key={i} className="cs-step">
              <span className="cs-step-n num" data-in>
                {pad(i + 1)}
              </span>
              <p data-in>{step}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
