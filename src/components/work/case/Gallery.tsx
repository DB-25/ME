"use client";

import { useEffect, useRef, useState } from "react";
import type { Media, Project } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Lightbox, useLightbox } from "@/components/ui/Lightbox";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { assetUrl } from "../asset";
import { pad } from "../meta";
import { CaseLabel } from "./CaseLabel";

/** Aspect ratios that decide the editorial rhythm. */
const WIDE_RATIO = 1.7;
const PAIR_MAX_RATIO = 2.3;
const PAIR_MAX_SPREAD = 1.5;

type Shot = { media: Media; index: number; ratio: number };
type Row =
  | { kind: "wide"; shots: [Shot] }
  | { kind: "inset"; shots: [Shot]; flip: boolean }
  | { kind: "pair"; shots: [Shot, Shot] };

/** Tiny blurred stand-in (built next to each still as NN.lq.jpg) so a frame is never an empty dark box while the full image loads. */
const lqipOf = (src: string) => assetUrl(src.replace(/\.jpg$/, ".lq.jpg"));

const ratioOf = (m: Media) => (m.width && m.height ? m.width / m.height : 16 / 9);

/**
 * One lead, then a 2-up when two neighbours are close in shape, then whatever is left,
 * alternating between full-width and inset-with-caption so the page never reads as a grid.
 */
export function planRows(media: Media[]): Row[] {
  const shots: Shot[] = media.map((m, index) => ({ media: m, index, ratio: ratioOf(m) }));
  const rows: Row[] = [];
  let insets = 0;
  const single = (s: Shot): Row => (s.ratio >= WIDE_RATIO ? { kind: "wide", shots: [s] } : { kind: "inset", shots: [s], flip: insets++ % 2 === 1 });

  let i = 0;
  while (i < shots.length) {
    const a = shots[i];
    const b = shots[i + 1];
    const canPair =
      i > 0 && b && a.ratio < PAIR_MAX_RATIO && b.ratio < PAIR_MAX_RATIO && Math.max(a.ratio, b.ratio) / Math.min(a.ratio, b.ratio) <= PAIR_MAX_SPREAD;
    if (canPair) {
      rows.push({ kind: "pair", shots: [a, b] });
      i += 2;
    } else {
      rows.push(single(a));
      i += 1;
    }
  }
  return rows;
}

function Figure({ shot, onOpen }: { shot: Shot; onOpen: (index: number) => void }) {
  const { media, index, ratio } = shot;
  const caption = media.caption ?? media.alt;
  return (
    <figure className="cs-fig" style={{ ["--ar" as string]: ratio.toFixed(4), ["--w" as string]: media.width ?? 1600, ["--grow" as string]: ratio.toFixed(3) }}>
      <button
        type="button"
        className="cs-shot"
        onClick={() => onOpen(index)}
        aria-label={`Enlarge: ${caption}`}
        aria-haspopup="dialog"
        data-cursor="view"
        style={{ backgroundImage: `url(${lqipOf(media.src)})` }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export, already sized */}
        <img src={assetUrl(media.src)} alt={media.alt} width={media.width} height={media.height} loading={index === 0 ? "eager" : "lazy"} fetchPriority={index === 0 ? "high" : undefined} decoding="async" />
        <span className="cs-shot-hint label" aria-hidden>
          Enlarge <span>+</span>
        </span>
      </button>
      <figcaption className="cs-cap label">
        <span className="num cs-cap-n">{pad(index + 1)}</span>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

export function Gallery({ project, n }: { project: Project; n: string }) {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const lightbox = useLightbox();
  const media = project.media;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();

    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>(".cs-fig").forEach((fig) => {
        const shot = fig.querySelector<HTMLElement>(".cs-shot");
        const cap = fig.querySelector<HTMLElement>("figcaption");
        if (!shot || !cap) return;
        const scrollTrigger = { trigger: shot, start: "top 88%", once: true };
        if (reduced) {
          gsap.from([shot, cap], { opacity: 0, duration: 0.6, ease: "none", scrollTrigger });
          return;
        }
        // The clip is cleared when done so the focus ring and glow are never cut off.
        gsap.fromTo(
          shot,
          { clipPath: "inset(0% 0% 30% 0% round 6px)", opacity: 0 },
          { clipPath: "inset(0% 0% 0% 0% round 6px)", opacity: 1, duration: 1.2, ease: EASE_OUT, clearProps: "clipPath", scrollTrigger },
        );
        gsap.from(cap, { opacity: 0, y: 10, duration: 1, delay: 0.15, ease: EASE_OUT, scrollTrigger });
      });
    }, el);

    return () => ctx.revert();
  }, []);

  if (!media.length) return null;

  const open = (index: number) => {
    setActive(index);
    lightbox.open();
  };
  const current = media[active] ?? media[0];
  const rows = planRows(media);

  return (
    <section className="cs-section" data-cs="gallery" data-cs-label="In use" aria-labelledby="cs-gallery">
      <div className="shell">
        <CaseLabel n={n} text="In use" />
        <h2 id="cs-gallery" className="headline cs-h2 mt-6">
          <Reveal as="span" className="block">
            The <Emph>work</Emph>, up close
          </Reveal>
        </h2>
        <div ref={root} className="cs-gal">
          {rows.map((row) => (
            <div key={row.shots[0].media.src} className="cs-row" data-kind={row.kind} data-flip={row.kind === "inset" && row.flip ? "" : undefined}>
              {row.shots.map((shot) => (
                <Figure key={shot.media.src} shot={shot} onOpen={open} />
              ))}
            </div>
          ))}
        </div>
      </div>
      <Lightbox
        controller={lightbox}
        image={{ src: current.src, alt: current.alt, width: current.width ?? 1600, height: current.height ?? 900 }}
        title={current.caption ?? current.alt}
        meta={
          <>
            <span className="text-accent">{pad(active + 1)}</span>
            <span className="mx-2 text-dim">/</span>
            {project.name}
          </>
        }
      />
    </section>
  );
}
