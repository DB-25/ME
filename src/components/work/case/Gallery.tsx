"use client";

import { useEffect, useRef } from "react";
import type { Media, Project } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { gsap, EASE_OUT, prefersReducedMotion } from "@/lib/motion";
import { assetUrl } from "../asset";
import { posterFor } from "../meta";
import { CaseLabel } from "./CaseLabel";

const WIDE_PX = 1000;
const MID_PX = 700;
const LANDSCAPE = 1.5;
const PARALLAX = 5;

/** Place each piece by its native resolution so small screenshots never get blown up. */
function placement(m: Media, i: number, smallSeen: number): { col: string; offset: boolean } {
  const w = m.width ?? 0;
  const ratio = m.width && m.height ? m.width / m.height : 1.78;
  if (w >= WIDE_PX) {
    if (ratio >= LANDSCAPE) return { col: i % 2 === 0 ? "1 / span 12" : "3 / span 10", offset: false };
    return { col: i % 2 === 0 ? "1 / span 8" : "5 / span 8", offset: false };
  }
  if (w >= MID_PX) return { col: i % 2 === 0 ? "1 / span 7" : "6 / span 7", offset: i % 2 === 1 };
  return smallSeen % 2 === 0 ? { col: "2 / span 5", offset: false } : { col: "8 / span 5", offset: true };
}

export function Gallery({ project, n }: { project: Project; n: string }) {
  const root = useRef<HTMLDivElement>(null);
  const media = project.media;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const reduced = prefersReducedMotion();
    const observers: IntersectionObserver[] = [];

    const ctx = gsap.context(() => {
      el.querySelectorAll<HTMLElement>(".cs-fig").forEach((fig) => {
        const frame = fig.querySelector<HTMLElement>(".cs-frame");
        const inner = fig.querySelector<HTMLElement>(".cs-frame-in");
        if (!frame || !inner) return;
        if (reduced) {
          gsap.from(fig, { opacity: 0, duration: 0.6, scrollTrigger: { trigger: fig, start: "top 90%", once: true } });
          return;
        }
        gsap.fromTo(
          frame,
          { clipPath: "inset(100% 0% 0% 0%)" },
          { clipPath: "inset(0% 0% 0% 0%)", duration: 1.4, ease: EASE_OUT, scrollTrigger: { trigger: fig, start: "top 88%", once: true } },
        );
        gsap.fromTo(
          inner,
          { scale: 1.14, yPercent: -PARALLAX },
          { scale: 1.14, yPercent: PARALLAX, ease: "none", scrollTrigger: { trigger: fig, start: "top bottom", end: "bottom top", scrub: true } },
        );
        gsap.from(fig.querySelector("figcaption"), { opacity: 0, y: 12, duration: 1, ease: EASE_OUT, scrollTrigger: { trigger: fig, start: "top 80%", once: true } });
      });
    }, el);

    // Videos: attach the source near the viewport, play only while visible.
    el.querySelectorAll<HTMLVideoElement>("video").forEach((v) => {
      if (reduced) v.controls = true;
      const io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting && !v.src && v.dataset.src) v.src = v.dataset.src;
            if (reduced) continue;
            if (e.isIntersecting && e.intersectionRatio > 0.3) void v.play().catch(() => undefined);
            else v.pause();
          }
        },
        { rootMargin: "400px 0px", threshold: [0, 0.3] },
      );
      io.observe(v);
      observers.push(io);
    });

    return () => {
      ctx.revert();
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  if (!media.length) return null;
  let small = 0;
  return (
    <section className="cs-section" data-cs="gallery" data-cs-label="In use" aria-labelledby="cs-gallery">
      <div className="shell">
        <CaseLabel n={n} text="In use" />
        <h2 id="cs-gallery" className="headline cs-h2 mt-6">
          <Reveal as="span" className="block">
            The <Emph>work</Emph>, up close
          </Reveal>
        </h2>
        <div ref={root} className="cs-gallery grid-12">
          {media.map((m, i) => {
            const isSmall = (m.width ?? 0) < MID_PX;
            const place = placement(m, i, small);
            if (isSmall) small++;
            const poster = m.kind === "video" ? posterFor(project, m) : undefined;
            const ratio = m.width && m.height ? `${m.width} / ${m.height}` : "16 / 9";
            return (
              <figure key={m.src} className="cs-fig" data-offset={place.offset ? "" : undefined} style={{ ["--col" as string]: place.col }}>
                <div className="cs-frame" style={{ aspectRatio: ratio }}>
                  <div className="cs-frame-in">
                    {m.kind === "video" ? (
                      <video
                        muted
                        loop
                        playsInline
                        preload="none"
                        poster={poster ? assetUrl(poster.src) : undefined}
                        data-src={`${assetUrl(m.src)}#t=0.1`}
                        aria-label={m.alt}
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={assetUrl(m.src)} alt={m.alt} width={m.width} height={m.height} loading="lazy" decoding="async" />
                    )}
                  </div>
                </div>
                <figcaption className="label">
                  <span className="num text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <span>{m.caption ?? m.alt}</span>
                </figcaption>
              </figure>
            );
          })}
        </div>
      </div>
    </section>
  );
}
