"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Project } from "@/content";
import { assetUrl, caseHref } from "./asset";
import { CATEGORY_LABEL, previewImage } from "./meta";
import { OwnershipBadge } from "./OwnershipBadge";
import { useStageFilm } from "./useStageFilm";

/** The pointer must rest this long on a row before the stage swaps, so sweeping down the list does not strobe. */
const SWAP_INTENT_MS = 90;

type Props = {
  projects: Project[];
  /** The project to show (hovered, focused or Director's pick). */
  slug: string;
  spot: boolean;
  /** True while the visitor is pointing at the list or the stage: the only time a film may start. */
  intent: boolean;
  films: boolean;
};

/**
 * The large preview beside the list (wide screens with a mouse). Stills are 4:3 title-free art cover-cropped into a
 * 16:9 frame, mounted the first time a project is shown (no first-load cost) and cross-faded; the 16:9 film plays over
 * them uncropped. Captions for every project are stacked in one grid cell so the stage never changes height.
 */
export function WorkStage({ projects, slug, spot, intent, films }: Props) {
  const frame = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(slug);
  const [seen, setSeen] = useState<string[]>([projects[0].slug]);
  // A still only cross-fades in once it has decoded, so a slow load never shows an empty frame between two projects.
  const [loaded, setLoaded] = useState<string[]>([]);
  const [vis, setVis] = useState(projects[0].slug);
  const markLoaded = (s: string) => setLoaded((l) => (l.includes(s) ? l : [...l, s]));

  useEffect(() => {
    if (slug === shown) return;
    const t = window.setTimeout(() => setShown(slug), SWAP_INTENT_MS);
    return () => window.clearTimeout(t);
  }, [slug, shown]);
  // Derived during render (guarded): mount a project's still the first time it is shown, and show it once it has decoded.
  if (!seen.includes(shown)) setSeen([...seen, shown]);
  if (loaded.includes(shown) && vis !== shown) setVis(shown);

  const current = projects.find((p) => p.slug === shown) ?? projects[0];
  useStageFilm(frame, current.film ? assetUrl(current.film.src) : undefined, films && intent && slug === shown);

  return (
    <div className="wk-stage" data-spot={spot ? "" : undefined} aria-hidden>
      <Link href={caseHref(current.slug)} className="wk-stage-link" data-cursor="open" tabIndex={-1}>
        <div ref={frame} className="wk-frame">
          {projects
            .filter((p) => seen.includes(p.slug))
            .map((p) => {
              const img = previewImage(p);
              return img ? (
                <img
                  key={p.slug}
                  className="wk-still"
                  data-on={p.slug === vis ? "" : undefined}
                  loading="lazy"
                  ref={(el) => {
                    if (el?.complete && el.naturalWidth) markLoaded(p.slug);
                  }}
                  onLoad={() => markLoaded(p.slug)}
                  src={assetUrl(img.src43 ?? img.src)}
                  alt=""
                  width={img.src43 ? 1200 : img.width}
                  height={img.src43 ? 900 : img.height}
                  decoding="async"
                />
              ) : null;
            })}
        </div>
        <div className="wk-caps">
          {projects.map((p) => (
            <div key={p.slug} className="wk-cap" data-on={p.slug === shown ? "" : undefined}>
              <p className="wk-cap-meta label">
                {spot && p.slug === shown ? (
                  <span className="wk-badge">
                    <i aria-hidden /> Director&apos;s pick
                  </span>
                ) : (
                  <span>
                    <span className="num">{p.year}</span> &middot; {CATEGORY_LABEL[p.category]}
                  </span>
                )}
                <span className="wk-cap-go">
                  Open case study <span aria-hidden>&rarr;</span>
                </span>
              </p>
              {p.owned ? (
                <p className="wk-cap-own">
                  <span className="wk-cap-own-k">
                    <span className="label">I owned</span>
                    <OwnershipBadge ownership={p.ownership} />
                  </span>
                  {p.owned}
                </p>
              ) : null}
            </div>
          ))}
        </div>
      </Link>
    </div>
  );
}
