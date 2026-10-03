import "../fade.css";
import { metrics, type Metric } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { assetUrl } from "@/lib/asset";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";
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
      className="label link inline-block !text-[12px] !text-ink/70 hover:!text-ink"
    >
      {ref.label}
    </a>
  );
}

function Context({ metric, className = "" }: { metric: Metric; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <Scrim strength={0.9} inset="-18% -12%" />
      <p className={`max-w-[26rem] text-[0.9375rem] leading-[1.55] text-ink/80 ${SHADOW}`}>{metric.context}</p>
      <p className="mt-3">
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
      <div className="sx-out shell py-[clamp(72px,8vw,120px)]">
        <header className="grid-12 gap-y-6">
          <div className="col-span-12 md:col-span-8">
            <SectionLabel chapter="impact" />
            <Reveal as="h2" className="headline mt-5">
              <span id="impact-title">Every number has a receipt.</span>
            </Reveal>
          </div>
          <FadeIn delay={0.15} className="relative col-span-12 md:col-span-3 md:col-start-10 md:self-end">
            <Scrim strength={0.7} />
            <p className={`lede !text-[1rem] ${SHADOW}`}>
              Each figure links to where it came from. Where I report it myself, the line says so.
            </p>
          </FadeIn>
        </header>

        <div className="mt-[clamp(40px,6vw,88px)] grid-12 items-end gap-y-8">
          <FadeIn className="col-span-12 border-t border-hairline-strong pt-4 md:col-span-8">
            <p className="label !text-[12px] !text-ink">{LEAD.label}</p>
            <div className="mt-[clamp(10px,1.6vw,22px)]">
              <Figure metric={LEAD} size="text-[clamp(4.75rem,20vw,20rem)]" />
            </div>
          </FadeIn>
          <FadeIn delay={0.1} className="col-span-12 md:col-span-4 md:pb-4">
            <Context metric={LEAD} />
          </FadeIn>
        </div>

        <ul className="grid-12 mt-[clamp(40px,6vw,88px)] gap-y-12">
          {LARGE.map((m, i) => (
            <li key={m.label} className={`col-span-12 md:col-span-6 ${i === 1 ? "md:mt-[5vw]" : ""}`}>
              <FadeIn className="border-t border-hairline-strong pt-4">
                <p className="label !text-[12px] !text-ink">{m.label}</p>
                <div className="mt-[clamp(10px,1.6vw,22px)]">
                  <Figure metric={m} size="text-[clamp(3.75rem,9vw,9rem)]" />
                </div>
                <Context metric={m} className="mt-[clamp(12px,1.6vw,22px)]" />
              </FadeIn>
            </li>
          ))}
        </ul>

        <ul className="grid-12 mt-[clamp(40px,6vw,88px)] gap-y-12">
          {MEDIUM.map((m, i) => (
            <li key={m.label} className={`col-span-12 md:col-span-4 ${i === 1 ? "md:mt-[3vw]" : i === 2 ? "md:mt-[6vw]" : ""}`}>
              <FadeIn className="border-t border-hairline-strong pt-4">
                <p className="label !text-[12px] !text-ink">{m.label}</p>
                <div className="mt-[clamp(8px,1.2vw,16px)]">
                  <Figure metric={m} size="text-[clamp(3.25rem,6vw,6rem)]" />
                </div>
                <Context metric={m} className="mt-[clamp(10px,1.2vw,16px)]" />
              </FadeIn>
            </li>
          ))}
        </ul>

        {LEDGER.length > 0 && (
          <ul className="mt-[clamp(40px,6vw,88px)] grid gap-x-[var(--gutter)] md:grid-cols-2">
            {LEDGER.map((m) => (
              <li key={m.label} className="relative grid grid-cols-[minmax(0,7.5rem)_1fr] items-baseline gap-x-5 border-t border-hairline-strong py-5 md:grid-cols-[minmax(0,10rem)_1fr]">
                <Scrim strength={0.75} />
                <Figure metric={m} size="text-[clamp(2.5rem,4.4vw,4.25rem)]" />
                <div>
                  <p className="label !text-[12px] !text-ink">{m.label}</p>
                  <p className={`mt-2 max-w-[28rem] text-[0.9375rem] leading-[1.5] text-ink/80 ${SHADOW}`}>{m.context}</p>
                  <p className="mt-2">
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
