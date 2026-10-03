"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/content";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { caseHref } from "./asset";
import { CATEGORY_LABEL, KIND_LABEL, hasCase, pad, primaryLink } from "./meta";
import { assetUrl } from "@/lib/asset";

/** Three scannable groups, not one per category: government work, and everything else. */
type Filter = "all" | "gov" | "tools";
const FILTER_LABEL: Record<Filter, string> = { all: "All", gov: "Government AI", tools: "Tools and lab" };
const FILTERS: Filter[] = ["all", "gov", "tools"];
const groupOf = (p: Project): Exclude<Filter, "all"> => (p.category === "gov-ai" ? "gov" : "tools");

/** The lab: non-featured work as a quiet mono table, filterable by category. */
export function LabTable({ projects, offset, spotlight }: { projects: Project[]; offset: number; spotlight: string | null }) {
  const [picked, setFilter] = useState<Filter>("all");
  const list = useRef<HTMLUListElement>(null);
  const first = useRef(true);

  // A Director pick inside a hidden category must be visible, so it overrides the filter.
  const hidesPick = Boolean(spotlight) && picked !== "all" && !projects.some((p) => p.slug === spotlight && groupOf(p) === picked);
  const filter: Filter = hidesPick ? "all" : picked;
  const shown = filter === "all" ? projects : projects.filter((p) => groupOf(p) === filter);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const rows = list.current?.querySelectorAll("li");
    if (!rows?.length) return;
    const t = gsap.fromTo(
      rows,
      { opacity: 0, y: prefersReducedMotion() ? 0 : 14 },
      { opacity: 1, y: 0, duration: 0.7, ease: EASE_OUT, stagger: 0.04, overwrite: "auto" },
    );
    return () => {
      t.kill();
    };
  }, [filter]);

  const counts = (c: Filter) => (c === "all" ? projects.length : projects.filter((p) => groupOf(p) === c).length);

  return (
    <div className="wk-lab">
      <div className="wk-lab-filters" role="group" aria-label="Filter the lab by category">
        {FILTERS.map((c) => (
          <button key={c} type="button" className="wk-filter label" aria-pressed={filter === c} onClick={() => setFilter(c)}>
            {FILTER_LABEL[c]}
            <sup className="num">{counts(c)}</sup>
          </button>
        ))}
      </div>

      <ul ref={list} className="wk-lab-list" data-spot={spotlight ? "" : undefined}>
        {shown.map((p, i) => {
          const ext = primaryLink(p);
          const linked = hasCase(p);
          return (
            <li
              key={p.slug}
              className="wk-lab-row"
              data-spot={spotlight === p.slug ? "" : undefined}
            >
              <span className="wk-lab-idx label num">{pad(offset + i + 1)}</span>
              {linked ? (
                <Link href={caseHref(p.slug)} className="wk-lab-name" data-cursor="open">
                  {p.name}
                </Link>
              ) : ext ? (
                <a className="wk-lab-name" href={assetUrl(ext.href)} target="_blank" rel="noopener noreferrer" data-cursor="open">
                  {p.name}
                </a>
              ) : (
                <span className="wk-lab-name">{p.name}</span>
              )}
              <span className="wk-lab-year label num">{p.year}</span>
              <span className="wk-lab-what">
                {p.tagline}
                <span className="wk-lab-cat label">{CATEGORY_LABEL[p.category]}</span>
              </span>
              {ext ? (
                <a className="wk-lab-link label link" href={assetUrl(ext.href)} target="_blank" rel="noopener noreferrer">
                  {ext.kind ? KIND_LABEL[ext.kind] : "Visit"}: {ext.label}
                  <span aria-hidden> &#8599;</span>
                </a>
              ) : linked ? (
                <Link className="wk-lab-link label link" href={caseHref(p.slug)}>
                  Case study<span aria-hidden> &rarr;</span>
                </Link>
              ) : null}
              <span className="wk-lab-badge label" aria-hidden>
                Director&apos;s pick
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
