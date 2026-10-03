"use client";

import { useEffect, useRef } from "react";
import type { Metric, Project } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { tie } from "../meta";
import { CaseLabel } from "./CaseLabel";
import { DrawRule } from "./DrawRule";
import { assetUrl } from "@/lib/asset";

const COUNT_S = 1.8;

/** Split a metric into countable parts only when numeric + suffix reproduces the printed value exactly. */
function parts(m: Metric): { n: number; suffix: string } | null {
  if (m.numeric === undefined) return null;
  const suffix = m.suffix ?? "";
  const hasDecimal = !Number.isInteger(m.numeric);
  const text = hasDecimal ? String(m.numeric) : m.numeric.toLocaleString("en-US");
  return text + suffix === m.value ? { n: m.numeric, suffix } : null;
}

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
      el.querySelectorAll<HTMLElement>("[data-count]").forEach((node) => {
        const to = Number(node.dataset.count);
        const decimals = String(to).split(".")[1]?.length ?? 0;
        const state = { v: 0 };
        const write = () => {
          node.textContent = decimals ? state.v.toFixed(decimals) : Math.round(state.v).toLocaleString("en-US");
        };
        write();
        gsap.to(state, {
          v: to,
          duration: COUNT_S,
          ease: "power3.out",
          onUpdate: write,
          scrollTrigger: { trigger: node, start: "top 85%", once: true },
        });
      });
      el.querySelectorAll<HTMLElement>(".cs-out").forEach((row) => {
        gsap.from(row.querySelectorAll("[data-in]"), {
          y: 36,
          opacity: 0,
          duration: 1.1,
          ease: EASE_OUT,
          stagger: 0.08,
          scrollTrigger: { trigger: row, start: "top 85%", once: true },
        });
      });
    }, el);
    return () => ctx.revert();
  }, []);

  if (!project.outcomes.length) return null;
  return (
    <section className="cs-section" data-cs="outcomes" data-cs-label="Outcomes" aria-labelledby="cs-outcomes">
      <div className="shell">
        <CaseLabel n={n} text="Outcomes" />
        <h2 id="cs-outcomes" className="headline cs-h2 mt-6">
          <Reveal as="span" className="block">
            What it <Emph>did</Emph>
          </Reveal>
        </h2>
        <ol ref={root} className="cs-outs">
          {project.outcomes.map((m) => {
            const p = parts(m);
            const r = receipt(m.source);
            return (
              <li key={m.label} className="cs-out">
                <DrawRule />
                <div className="cs-out-grid grid-12">
                  <p className="cs-out-v num" data-one={m.value.startsWith("1") ? "" : undefined} style={{ ["--len" as string]: m.value.length, ["--cap" as string]: m.value.length <= 3 ? 21 : m.value.length <= 5 ? 16 : 12.5 }} data-in>
                    {p ? (
                      <>
                        <span data-count={p.n}>{m.value.replace(p.suffix, "")}</span>
                        {p.suffix ? <span className="cs-out-suffix">{p.suffix}</span> : null}
                      </>
                    ) : (
                      m.value
                    )}
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
