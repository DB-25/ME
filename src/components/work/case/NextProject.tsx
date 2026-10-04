import Link from "next/link";
import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { assetUrl, caseHref } from "../asset";
import { CATEGORY_LABEL, pad, previewImage, tie } from "../meta";

/** The bottom-of-page hand-off: a balanced two-column block, big still on the left, name and meta on the right. */
export function NextProject({ next, index, total }: { next: Project; index: number; total: number }) {
  const img = previewImage(next);
  const src43 = img?.src43;
  return (
    <section id="sec-next" className="cs-next" data-cs="next" data-cs-label="Up next" aria-labelledby="cs-next-h">
      <div className="shell">
        <Link href={caseHref(next.slug)} className="cs-next-link" data-cursor="open">
          <div className="cs-next-top">
            <p id="cs-next-h" className="label">
              Up next
            </p>
            <p className="label num">
              <span className="cs-index-n">{pad(index + 1)}</span>
              <span className="text-dim"> / {pad(total)}</span>
            </p>
          </div>

          <div className="cs-next-grid" data-still={img ? "" : undefined}>
            {img ? (
              <figure className="cs-next-thumb" data-plain={img.thumb ? undefined : ""} aria-hidden>
                <picture>
                  {src43 ? <source media="(max-width: 559px)" srcSet={assetUrl(src43)} /> : null}
                  <img src={assetUrl(img.src)} alt="" width={1600} height={900} loading="lazy" decoding="async" />
                </picture>
              </figure>
            ) : null}

            <div className="cs-next-copy">
              <div>
                <span className="cs-next-name">
                  <Reveal as="span" className="block">
                    {next.name}
                  </Reveal>
                </span>
                <p className="cs-next-tag">{tie(next.tagline)}</p>
                <p className="label cs-next-meta">
                  {next.year} <span className="text-dim">/</span> {CATEGORY_LABEL[next.category]}
                </p>
              </div>
              <span className="cs-next-cta label">
                Next project
                <span className="cs-next-arrow" aria-hidden>
                  &rarr;
                </span>
              </span>
            </div>
          </div>
        </Link>
      </div>
    </section>
  );
}
