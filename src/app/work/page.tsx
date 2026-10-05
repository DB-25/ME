import type { Metadata } from "next";
import Link from "next/link";
import { projects } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { hasCase, pad } from "@/components/work/meta";
import { pageMetadata } from "../page-metadata";

const cases = projects.filter(hasCase);

export const metadata: Metadata = pageMetadata({
  title: "Work",
  description: "Every project with a case study, with the problem, the build and the outcomes.",
  path: "/work/",
});

/** /work/ resolves to a plain index of the case studies, so trimming a case URL back one level never lands on a 404. */
export default function WorkPage() {
  return (
    <section className="shell pb-24 pt-32 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
      <p className="label">Work / Index</p>
      <h1 className="headline mt-6">
        Selected <Emph>work</Emph>
      </h1>
      <p className="lede mt-6 max-w-[34ch]">Every project with a case study. The full selection, with films, lives on the home page.</p>
      <ol className="mt-16 border-t border-hairline">
        {cases.map((p, i) => (
          <li key={p.slug} className="border-b border-hairline">
            <Link href={`/work/${p.slug}/`} prefetch={false} className="group grid min-h-11 grid-cols-12 items-baseline gap-x-6 gap-y-1 py-6">
              <span className="label col-span-2 md:col-span-1">{pad(i + 1)}</span>
              <span className="col-span-10 text-[clamp(1.5rem,2.6vw,2.25rem)] font-medium leading-tight tracking-[-0.03em] transition-colors duration-300 group-hover:text-accent-hot md:col-span-4">
                {p.name}
              </span>
              <span className="col-span-10 col-start-3 text-muted md:col-span-5 md:col-start-auto">{p.tagline}</span>
              <span className="label col-span-10 col-start-3 md:col-span-2 md:col-start-auto md:text-right">{p.year}</span>
            </Link>
          </li>
        ))}
      </ol>
      <Link href="/#work" prefetch={false} className="link label mt-10 inline-flex min-h-11 items-center" style={{ color: "var(--color-ink)" }}>
        See the full selection
      </Link>
    </section>
  );
}
