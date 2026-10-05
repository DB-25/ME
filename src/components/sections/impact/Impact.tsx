import "../fade.css";
import Link from "next/link";
import { metrics, type Metric } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { assetUrl } from "@/lib/asset";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";
import { BasisTag } from "./BasisTag";
import { Counter } from "./Counter";
import { sourceRef } from "./source";

/**
 * Editorial ranks. `metrics` is ordered by priority in content, so position is the only
 * thing that decides size: [0] dominates, [1..2] are large, [3..5] medium, the rest a ledger.
 */
const [LEAD, ...REST] = metrics;
const LARGE = REST.slice(0, 2);
const MEDIUM = REST.slice(2, 5);
const LEDGER = REST.slice(5);

const SHADOW = "[text-shadow:0_0_12px_rgb(6_5_9/1),0_0_28px_rgb(6_5_9/0.9)]";

function Source({ metric }: { metric: Metric }) {
  const ref = sourceRef(metric.source);
  if (!ref.href) return <span className="label !text-[12px] !text-ink/65">{ref.label}</span>;
  return (
    <a
      href={assetUrl(ref.href)}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="read"
      aria-label={`${ref.label}, for ${metric.label}`}
      className="group/src label -my-3.5 inline-block py-3.5 !text-[12px] !text-ink/75 transition-colors duration-300 hover:!text-accent-hot focus-visible:!text-accent-hot md:my-0 md:py-1"
    >
      <span className="underline decoration-ink/25 underline-offset-[5px] transition-colors duration-300 group-hover/src:decoration-accent-hot">{ref.label}</span>
      <span aria-hidden className="ml-1.5 inline-block transition-transform duration-500 ease-[var(--ease-out-expo)] group-hover/src:translate-x-0.5 group-hover/src:-translate-y-0.5">
        &#8599;
      </span>
    </a>
  );
}

function Context({ metric, className = "" }: { metric: Metric; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Scrim strength={0.9} inset="-18% -12%" />
      <p className={`max-w-[26rem] text-[0.9375rem] leading-[1.55] text-ink/80 ${SHADOW}`}>{metric.context}</p>
      <p className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1 md:mt-3">
        <BasisTag metric={metric} />
        <Source metric={metric} />
      </p>
    </div>
  );
}

function Figure({ metric, size }: { metric: Metric; size: string }) {
  return (
    <div className={`font-medium leading-[0.86] tracking-[-0.055em] text-ink ${size}`}>
      <Counter metric={metric} className="" />
    </div>
  );
}

/** 01 / Impact. One dominant number, a varied grid for the rest, every figure with its receipt. */
export function Impact() {
  if (!LEAD) return null;
  return (
    <section id="impact" data-chapter="impact" aria-labelledby="impact-title" className="sx-in relative">
      <div className="sx-out shell pb-[clamp(48px,6vw,96px)] pt-[clamp(24px,3vw,48px)]">
        <header className="grid-12 gap-y-6">
          <div className="col-span-12 md:col-span-8">
            <SectionLabel chapter="impact" />
            <Reveal as="h2" className="headline mt-5">
              <span id="impact-title">Numbers, and who says so.</span>
            </Reveal>
          </div>
          <FadeIn delay={0.15} className="relative col-span-12 md:col-span-3 md:col-start-10 md:self-end">
            <Scrim strength={0.7} />
            <p className={`lede !text-[1rem] ${SHADOW}`}>
              Each figure says who stands behind it: a third party, my employer, or me. Where there is a public page, it links.
            </p>
            <Link href="/receipts/" data-cursor="open" className={`label link relative mt-4 inline-flex min-h-11 items-center !text-[12px] !text-ink/80 hover:!text-accent-hot focus-visible:!text-accent-hot ${SHADOW}`}>
              All receipts<span aria-hidden className="ml-2">&rarr;</span>
            </Link>
          </FadeIn>
        </header>

        <div className="mt-[clamp(28px,3.6vw,56px)] grid-12 items-end gap-y-8">
          <FadeIn className="col-span-12 border-t border-hairline-strong pt-4 md:col-span-8">
            <p className="label !text-[12px] !text-ink">{LEAD.label}</p>
            <div className="mt-[clamp(10px,1.6vw,22px)]">
              {/* The "1" carries a wide left bearing at this size: pull it back so the digits sit on the rule's left edge. */}
              <Figure metric={LEAD} size="-ml-[0.065em] text-[clamp(4rem,23vw,6.5rem)] md:text-[clamp(4rem,17vw,15rem)]" />
            </div>
          </FadeIn>
          <FadeIn delay={0.1} className="col-span-12 md:col-span-4 md:pb-4">
            <Context metric={LEAD} />
          </FadeIn>
        </div>

        <ul className="grid-12 mt-[clamp(28px,4vw,56px)] gap-y-8">
          {LARGE.map((m, i) => (
            <li key={m.label} className={`col-span-12 md:col-span-6 ${i === 1 ? "md:mt-[3vw]" : ""}`}>
              <FadeIn className="border-t border-hairline-strong pt-4">
                <p className="label !text-[12px] !text-ink">{m.label}</p>
                <div className="mt-[clamp(10px,1.6vw,22px)]">
                  <Figure metric={m} size="text-[clamp(3.25rem,8vw,8rem)]" />
                </div>
                <Context metric={m} className="mt-[clamp(12px,1.6vw,22px)]" />
              </FadeIn>
            </li>
          ))}
        </ul>

        <ul className="grid-12 mt-[clamp(28px,4vw,56px)] gap-y-8">
          {MEDIUM.map((m, i) => (
            <li key={m.label} className={`col-span-12 md:col-span-4 ${i === 1 ? "md:mt-[2vw]" : i === 2 ? "md:mt-[4vw]" : ""}`}>
              <FadeIn className="border-t border-hairline-strong pt-4">
                <p className="label !text-[12px] !text-ink">{m.label}</p>
                <div className="mt-[clamp(8px,1.2vw,16px)]">
                  <Figure metric={m} size="text-[clamp(2.75rem,5.4vw,5.5rem)]" />
                </div>
                <Context metric={m} className="mt-[clamp(10px,1.2vw,16px)]" />
              </FadeIn>
            </li>
          ))}
        </ul>

        {LEDGER.length > 0 && (
          <ul className="mt-[clamp(28px,4vw,56px)] grid gap-x-[var(--gutter)] md:grid-cols-2">
            {LEDGER.map((m) => (
              <li key={m.label} className="relative grid grid-cols-[minmax(0,7.5rem)_1fr] items-baseline gap-x-5 border-t border-hairline-strong py-4 md:grid-cols-[minmax(0,10rem)_1fr]">
                <Scrim strength={0.75} />
                <Figure metric={m} size="text-[clamp(2.5rem,4.4vw,4.25rem)]" />
                <div>
                  <p className="label !text-[12px] !text-ink">{m.label}</p>
                  <p className={`mt-2 max-w-[28rem] text-[0.9375rem] leading-[1.5] text-ink/80 ${SHADOW}`}>{m.context}</p>
                  <p className="mt-1 flex flex-wrap items-baseline gap-x-4 gap-y-1 md:mt-2">
                    <BasisTag metric={m} />
                    <Source metric={m} />
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
