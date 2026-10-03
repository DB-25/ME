import { metrics, type Metric } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "../origin/FadeIn";
import { Counter } from "./Counter";
import { sourceRef } from "./source";

type Tier = "hero" | "large" | "medium" | "small";

const NUMBER_SIZE: Record<Tier, string> = {
  hero: "text-[clamp(4.5rem,15.5vw,16rem)]",
  large: "text-[clamp(4rem,10vw,10rem)]",
  medium: "text-[clamp(3.5rem,8vw,8rem)]",
  small: "text-[clamp(3.25rem,5.6vw,5.75rem)]",
};

/** Editorial placement. Keyed by metric label so the content file stays the only source of facts. */
const PLACEMENT: { label: string; tier: Tier; cell: string }[] = [
  { label: "State employees with access", tier: "hero", cell: "md:col-span-9" },
  { label: "AI tools shipped", tier: "large", cell: "md:col-span-3 md:self-end" },
  { label: "Government and civic partners", tier: "medium", cell: "md:col-span-5 md:col-start-2 md:mt-[6vw]" },
  { label: "Users on my first big app", tier: "large", cell: "md:col-span-6 md:col-start-7" },
  { label: "NASPO awards in 2025", tier: "small", cell: "md:col-span-3" },
  { label: "Place, AWS x Riot Games hackathon", tier: "small", cell: "md:col-span-3 md:mt-[7vw]" },
  { label: "Lower model spend", tier: "small", cell: "md:col-span-3 md:mt-[2.5vw]" },
  { label: "Languages in production", tier: "small", cell: "md:col-span-3 md:mt-[10vw]" },
];

const byLabel = new Map(metrics.map((m) => [m.label, m]));
const ITEMS = PLACEMENT.flatMap((p) => {
  const metric = byLabel.get(p.label);
  return metric ? [{ ...p, metric }] : [];
});
// Anything not placed above still ships, as a small cell at the end.
const PLACED = new Set(ITEMS.map((i) => i.metric.label));
const EXTRA = metrics.filter((m) => !PLACED.has(m.label)).map((metric) => ({ metric, tier: "small" as Tier, cell: "md:col-span-3" }));

function Source({ metric }: { metric: Metric }) {
  const ref = sourceRef(metric.source);
  if (!ref.href) return <span className="label !text-faint">{ref.label}</span>;
  return (
    <a
      href={ref.href}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="read"
      className="label link inline-block !text-muted hover:!text-ink"
    >
      {ref.label}
    </a>
  );
}

/** 04 / Impact. One dominant number, the rest in a ledger, every figure with its receipt. */
export function Impact() {
  return (
    <section id="impact" data-chapter="impact" aria-labelledby="impact-title" className="relative">
      <div className="shell py-[clamp(96px,14vw,220px)]">
        <header className="grid-12 gap-y-6">
          <div className="col-span-12 md:col-span-8">
            <SectionLabel chapter="impact" />
            <Reveal as="h2" className="headline mt-5">
              <span id="impact-title">
                Numbers that come with <Emph>receipts</Emph>
              </span>
            </Reveal>
          </div>
          <FadeIn delay={0.15} className="col-span-12 md:col-span-3 md:col-start-10 md:self-end">
            <p className="lede !text-[1rem]">Every figure links to where it came from. Where I report it myself, the line says so.</p>
          </FadeIn>
        </header>

        <ul className="grid-12 mt-[clamp(56px,9vw,150px)] gap-y-[clamp(56px,8vw,128px)]">
          {[...ITEMS, ...EXTRA].map(({ metric, tier, cell }) => (
            <li key={metric.label} className={`col-span-12 ${cell}`}>
              <FadeIn className="border-t border-hairline-strong pt-4">
                <p className="label !text-ink">{metric.label}</p>
                <div className={`mt-[clamp(12px,2vw,28px)] font-medium leading-[0.86] tracking-[-0.055em] text-ink ${NUMBER_SIZE[tier]}`}>
                  <Counter metric={metric} className="" />
                </div>
                <p className="mt-[clamp(14px,2vw,28px)] max-w-[26rem] text-[0.9375rem] leading-[1.55] text-ink/75 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_28px_rgb(6_5_9/0.9)]">
                  {metric.context}
                </p>
                <p className="mt-4">
                  <Source metric={metric} />
                </p>
              </FadeIn>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
