"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { Project } from "@/content";
import {
  gsap,
  ScrollTrigger,
  EASE_OUT,
  prefersReducedMotion,
} from "@/lib/motion";
import { assetUrl, caseHref } from "./asset";
import { CATEGORY_LABEL, pad, previewImage } from "./meta";
import { useDesktopHover } from "./useDesktopHover";
import { useRowFilm } from "./useRowFilm";

type Props = { projects: Project[]; spotlight: string | null };

/** Name as rolling characters: sans on top, the last word swaps whole into the accent colour on activate. */
function RollName({ name }: { name: string }) {
  const words = name.split(" ");
  const offsets = words.map((_, wi) =>
    words.slice(0, wi).reduce((n, w) => n + [...w].length, 0),
  );
  return (
    <h3 className="wk-name" style={{ ["--n" as string]: Math.max(name.length, 8) }}>
      <span className="sr-only">{name}</span>
      <span className="wk-nmask" aria-hidden>
        <span className="wk-nline">
          {words.map((w, wi) => {
            const last = wi === words.length - 1;
            // Earlier words roll letter by letter; the last word swaps whole.
            const parts = last ? [w] : [...w];
            return (
              <Fragment key={wi}>
                <span className={last ? "wk-word wk-last" : "wk-word"}>
                  {parts.map((c, ci) => (
                    <span
                      key={ci}
                      className="wk-ch"
                      style={{ ["--i" as string]: last ? 0 : offsets[wi] + ci }}
                    >
                      <span className="wk-a">{c}</span>
                      <span className="wk-b">{c}</span>
                    </span>
                  ))}
                </span>
                {last ? null : " "}
              </Fragment>
            );
          })}
        </span>
      </span>
    </h3>
  );
}

function Row({
  project,
  index,
  active,
  spot,
  films,
  onHover,
  onFocusChange,
}: {
  project: Project;
  index: number;
  active: boolean;
  spot: boolean;
  films: boolean;
  onHover: (slug: string | null, e: React.PointerEvent) => void;
  onFocusChange: (slug: string | null) => void;
}) {
  const img = previewImage(project);
  const lead = project.outcomes[0];
  const frame = useRef<HTMLElement>(null);
  useRowFilm(frame, project.film ? assetUrl(project.film.src) : undefined, active, films);
  return (
    <li
      className="wk-row"
      data-slug={project.slug}
      data-active={active ? "" : undefined}
      data-spot={spot ? "" : undefined}
    >
      <Link
        href={caseHref(project.slug)}
        className="wk-link"
        onPointerEnter={(e) => onHover(project.slug, e)}
        onFocus={() => onFocusChange(project.slug)}
        onBlur={() => onFocusChange(null)}
      >
        <span className="wk-idx label num" data-reveal>
          {pad(index + 1)}
        </span>

        <RollName name={project.name} />

        <div className="wk-meta label" data-reveal>
          <span className="wk-badge">
            <i aria-hidden /> Director&apos;s pick
          </span>
          <span className="num">{project.year}</span>
          <span>{CATEGORY_LABEL[project.category]}</span>
        </div>

        <div className="wk-media">
          {img ? (
            <figure ref={frame} className="wk-inline" data-cursor="open" data-thumb={img.thumb ? "" : undefined}>
              <img
                src={assetUrl(img.src43 ?? img.src)}
                alt={img.alt}
                width={img.src43 ? 1200 : img.width}
                height={img.src43 ? 900 : img.height}
                loading="lazy"
                decoding="async"
              />
            </figure>
          ) : (
            <div className="wk-inline wk-inline-type" aria-hidden>
              <span>{project.name}</span>
            </div>
          )}
        </div>

        <p className="wk-tag" data-reveal>
          {project.tagline}
        </p>

        {lead ? (
          <p className="wk-out" data-reveal>
            <span className="wk-out-v num">{lead.value}</span>
            <span className="wk-out-l label">{lead.label}</span>
          </p>
        ) : null}

        {project.owned ? (
          <p className="wk-own" data-reveal>
            <span className="wk-own-k label">I owned</span>
            <span className="wk-own-v">{project.owned}</span>
          </p>
        ) : null}

        <div className="wk-pick" aria-hidden={!spot}>
          <dl className="wk-pick-facts">
            {project.outcomes.slice(0, 3).map((o) => (
              <div key={o.label}>
                <dd className="num">{o.value}</dd>
                <dt className="label">{o.label}</dt>
              </div>
            ))}
          </dl>
          <p className="wk-pick-cta label">
            <span>{project.role}</span>
            <span>
              Open case study <span aria-hidden>&rarr;</span>
            </span>
          </p>
        </div>
      </Link>
    </li>
  );
}

export function FeaturedIndex({ projects, spotlight }: Props) {
  const list = useRef<HTMLOListElement>(null);
  const [hover, setHover] = useState<string | null>(null);
  const [focus, setFocus] = useState<string | null>(null);
  const desktop = useDesktopHover();

  // Entrance: names rise inside their masks, details fade up, once per row.
  useEffect(() => {
    const root = list.current;
    if (!root) return;
    const reduced = prefersReducedMotion();
    const ctx = gsap.context(() => {
      root.querySelectorAll<HTMLElement>(".wk-row").forEach((row) => {
        const line = row.querySelector<HTMLElement>(".wk-nline");
        const bits = row.querySelectorAll<HTMLElement>("[data-reveal]");
        const st = { trigger: row, start: "top 88%", once: true };
        if (reduced) {
          gsap.from([line, ...bits], {
            opacity: 0,
            duration: 0.6,
            scrollTrigger: st,
          });
          return;
        }
        gsap.from(line, {
          yPercent: 115,
          duration: 1.15,
          ease: EASE_OUT,
          scrollTrigger: st,
        });
        gsap.from(bits, {
          y: 24,
          opacity: 0,
          duration: 1,
          ease: EASE_OUT,
          stagger: 0.06,
          delay: 0.15,
          scrollTrigger: st,
        });
      });
    }, root);
    return () => ctx.revert();
  }, []);

  // A Director pick can land while the page is still scrolling and before the row's entrance has played:
  // finish that entrance now so the spotlighted row is never left hidden.
  useEffect(() => {
    if (!spotlight) return;
    const row = list.current?.querySelector<HTMLElement>(
      `.wk-row[data-slug="${spotlight}"]`,
    );
    if (!row) return;
    ScrollTrigger.getAll()
      .filter((st) => st.trigger === row)
      .forEach((st) => {
        st.animation?.progress(1);
        st.kill();
      });
    // On the phone carousel, bring the picked card into view.
    const el = list.current;
    if (el && el.scrollWidth > el.clientWidth + 4) {
      el.scrollTo({ left: Math.max(0, row.offsetLeft - parseFloat(getComputedStyle(el).paddingLeft)), behavior: prefersReducedMotion() ? "auto" : "smooth" });
    }
  }, [spotlight]);

  // Carousel state (phones and tablets): which card leads, and whether either end is reached.
  const [pos, setPos] = useState({ i: 0, start: true, end: false });
  const readPos = useCallback(() => {
    const el = list.current;
    const card = el?.querySelector<HTMLElement>(".wk-row");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    const next = {
      i: Math.round(el.scrollLeft / (card.offsetWidth + gap)),
      start: el.scrollLeft <= 2,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
    };
    setPos((prev) => (prev.i === next.i && prev.start === next.start && prev.end === next.end ? prev : next));
  }, []);
  useEffect(() => {
    readPos();
    window.addEventListener("resize", readPos);
    return () => window.removeEventListener("resize", readPos);
  }, [readPos]);
  const page = (dir: 1 | -1) => {
    const el = list.current;
    const card = el?.querySelector<HTMLElement>(".wk-row");
    if (!el || !card) return;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? "auto" : "smooth" });
  };

  const current = hover ?? focus;
  return (
    <>
      <ol
        ref={list}
        className="wk-list"
        data-hover={current ? "" : undefined}
        data-spot={spotlight ? "" : undefined}
        onPointerLeave={() => setHover(null)}
        onScroll={readPos}
      >
        {projects.map((p, i) => (
          <Row
            key={p.slug}
            project={p}
            index={i}
            active={current === p.slug || spotlight === p.slug}
            spot={spotlight === p.slug}
            films={desktop}
            onHover={(slug, e) => e.pointerType === "mouse" && setHover(slug)}
            onFocusChange={setFocus}
          />
        ))}
      </ol>
      <div className="wk-ctl" role="group" aria-label="Browse featured projects">
        <button type="button" className="wk-arrow" aria-label="Previous project" disabled={pos.start} onClick={() => page(-1)}>
          <span aria-hidden>&larr;</span>
        </button>
        <button type="button" className="wk-arrow" aria-label="Next project" disabled={pos.end} onClick={() => page(1)}>
          <span aria-hidden>&rarr;</span>
        </button>
        <p className="wk-ctl-count label num" aria-hidden>
          {pad(pos.end ? projects.length : Math.min(pos.i + 1, projects.length))} / {pad(projects.length)}
          <span className="wk-ctl-hint"> Swipe</span>
        </p>
      </div>
    </>
  );
}
