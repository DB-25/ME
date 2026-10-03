import Link from "next/link";
import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { caseHref } from "../asset";
import { CATEGORY_LABEL, pad } from "../meta";

/** The bottom-of-page hand-off: the next project's name, large enough to click into. */
export function NextProject({ next, index, total }: { next: Project; index: number; total: number }) {
  return (
    <section className="cs-next" data-cs="next" data-cs-label="Up next" aria-labelledby="cs-next-h">
      <div className="shell">
        <Link href={caseHref(next.slug)} className="cs-next-link" data-cursor="open">
          <div className="cs-next-top">
            <p id="cs-next-h" className="label">
              Next project
            </p>
            <p className="label num">
              <span className="cs-index-n">{pad(index + 1)}</span>
              <span className="text-dim"> / {pad(total)}</span>
            </p>
          </div>
          <span className="cs-next-name" style={{ ["--len" as string]: next.name.length }}>
            <Reveal as="span" className="block">
              {next.name}
            </Reveal>
          </span>
          <span className="cs-next-bar" aria-hidden />
          <div className="cs-next-foot">
            <p className="cs-next-tag">{next.tagline}</p>
            <p className="label">
              {next.year} <span className="text-dim">/</span> {CATEGORY_LABEL[next.category]}
              <span className="cs-next-arrow" aria-hidden>
                &rarr;
              </span>
            </p>
          </div>
        </Link>
      </div>
    </section>
  );
}
