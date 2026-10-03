"use client";

import { useEffect, useRef } from "react";
import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { headlineFor, tie } from "../meta";
import { CaseLabel } from "./CaseLabel";
import { DrawRule } from "./DrawRule";
import { assetUrl } from "@/lib/asset";

/** A receipt chip exists only for a public page, labelled by its host. Files and logs stay off the page. */
function receipt(source: string): { text: string; href: string } | null {
  if (!/^https?:\/\//.test(source)) return null;
  try {
    return { text: new URL(source).hostname.replace(/^www\./, ""), href: source };
  } catch {
    return null;
  }
}

export function Outcomes({ project, n }: { project: Project; n: string }) {
  const root = useRef<HTMLOListElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>(".cs-out").forEach((row) => {
        gsap.from(row.querySelectorAll("[data-in]"), {
          y: 16,
          opacity: 0,
          duration: 0.7,
          ease: EASE_OUT,
          stagger: 0.06,
          scrollTrigger: { trigger: row, start: "top 85%", once: true },
        });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  const h = headlineFor(project, "outcomes", "What it did");
  if (!project.outcomes.length) return null;
  return (
    <section className="cs-section" data-cs="outcomes" data-cs-label="Outcomes" aria-labelledby="cs-outcomes">
      <div className="shell">
        <CaseLabel n={n} text="Outcomes" />
        <h2 id="cs-outcomes" className={`headline cs-h2 mt-6${h.long ? " cs-h2-long" : ""}`}>
          <Reveal as="span" className="block">
            {tie(h.text)}
          </Reveal>
        </h2>
        <ol ref={root} className="cs-outs">
          {project.outcomes.map((m) => {
            const r = receipt(m.source);
            return (
              <li key={m.label} className="cs-out">
                <DrawRule />
                <div className="cs-out-grid grid-12">
                  <p className="cs-out-v num" data-one={m.value.startsWith("1") ? "" : undefined} style={{ ["--len" as string]: m.value.length, ["--cap" as string]: m.value.length <= 3 ? 21 : m.value.length <= 5 ? 16 : 12.5 }} data-in>
                    {m.value}
                  </p>
                  <div className="cs-out-text">
                    <h3 className="cs-out-label" data-in>
                      {tie(m.label)}
                    </h3>
                    <p className="cs-out-ctx" data-in>
                      {tie(m.context)}
                    </p>
                    {r ? (
                      <p className="label cs-out-src" data-in>
                        Source:{" "}
                        <a href={assetUrl(r.href)} target="_blank" rel="noopener noreferrer" className="link !text-ink">
                          {r.text}
                          <span aria-hidden> &#8599;</span>
                        </a>
                      </p>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
