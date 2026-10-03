"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import type { Project } from "@/content";
import {
  gsap,
  ScrollTrigger,
  EASE_OUT,
  prefersReducedMotion,
} from "@/lib/motion";
import { assetUrl, caseHref } from "./asset";
import { CATEGORY_LABEL, pad, previewImage } from "./meta";
import { CursorPreview, type PreviewItem } from "./CursorPreview";
import { useDesktopHover } from "./useDesktopHover";

type Props = { projects: Project[]; spotlight: string | null };

/** Name as rolling characters: sans on top, the last word swaps to serif italic on activate. */
function RollName({ name }: { name: string }) {
  const words = name.split(" ");
  const offsets = words.map((_, wi) =>
    words.slice(0, wi).reduce((n, w) => n + [...w].length, 0),
  );
  return (
    <h3 className="wk-name">
      <span className="sr-only">{name}</span>
      <span className="wk-nmask" aria-hidden>
        <span className="wk-nline">
          {words.map((w, wi) => {
            const last = wi === words.length - 1;
            // Earlier words roll letter by letter; the last word swaps whole into serif italic.
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
  onHover,
  onFocusChange,
}: {
  project: Project;
  index: number;
  active: boolean;
  spot: boolean;
  onHover: (slug: string | null, e: React.PointerEvent) => void;
  onFocusChange: (slug: string | null) => void;
}) {
  const img = previewImage(project);
  const lead = project.outcomes[0];
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
        data-cursor="open"
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

        {img ? (
          <figure className="wk-inline" data-thumb={img.thumb ? "" : undefined} data-reveal>
            <picture>
              {img.src43 ? <source media="(max-width: 559px)" srcSet={assetUrl(img.src43)} /> : null}
              <img
                src={assetUrl(img.src)}
                alt={img.alt}
                width={img.width}
                height={img.height}
                loading="lazy"
                decoding="async"
              />
            </picture>
          </figure>
        ) : (
          <div className="wk-inline wk-inline-type" aria-hidden data-reveal>
            <span>{project.name}</span>
          </div>
        )}

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
          <div className="wk-pick-in">
            <div className="wk-pick-body">
              <div className="wk-pick-media" data-thumb={img?.thumb ? "" : undefined}>
                {img ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={assetUrl(img.src)}
                    alt=""
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="wk-pick-type">
                    <span>{project.name}</span>
                  </div>
                )}
              </div>
              <div className="wk-pick-side">
                <dl className="wk-pick-facts">
                  {project.outcomes.map((o) => (
                    <div key={o.label}>
                      <dt className="label">{o.label}</dt>
                      <dd className="num">{o.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="wk-pick-cta label">
                  {project.role} <span aria-hidden>/</span> Open case study{" "}
                  <span aria-hidden>&rarr;</span>
                </p>
              </div>
            </div>
          </div>
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

  const items = useMemo<PreviewItem[]>(
    () =>
      projects.map((p) => {
        const img = previewImage(p);
        return {
          slug: p.slug,
          name: p.name,
          src: img ? assetUrl(img.src) : undefined,
          raw: img ? !img.thumb : false,
          video: p.film ? assetUrl(p.film.src) : undefined,
          alt: img?.alt ?? p.name,
        };
      }),
    [projects],
  );

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
  }, [spotlight]);

  // The expanding row changes document height: let ScrollTrigger re-measure after it settles.
  useEffect(() => {
    const t = window.setTimeout(() => ScrollTrigger.refresh(), 1100);
    return () => window.clearTimeout(t);
  }, [spotlight]);

  const current = hover ?? focus;
  return (
    <>
      <ol
        ref={list}
        className="wk-list"
        data-hover={current ? "" : undefined}
        data-spot={spotlight ? "" : undefined}
        onPointerLeave={() => setHover(null)}
      >
        {projects.map((p, i) => (
          <Row
            key={p.slug}
            project={p}
            index={i}
            active={current === p.slug || spotlight === p.slug}
            spot={spotlight === p.slug}
            onHover={(slug, e) => e.pointerType === "mouse" && setHover(slug)}
            onFocusChange={setFocus}
          />
        ))}
      </ol>
      {desktop ? <CursorPreview items={items} activeSlug={hover} /> : null}
    </>
  );
}
