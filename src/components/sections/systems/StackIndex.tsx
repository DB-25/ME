import { stack } from "@/content";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";

/**
 * The dozen tools behind most of what I have shipped, in three short lines. Names are looked up in
 * the content stack, so a tool that is not listed there never appears here.
 */
const LINES: { name: string; items: string[] }[] = [
  { name: "Models and agents", items: ["Claude via Amazon Bedrock", "OpenAI", "RAG", "RAGAS evaluation"] },
  { name: "Cloud", items: ["AWS CDK", "Step Functions", "Lambda", "OpenSearch Serverless"] },
  { name: "Product", items: ["TypeScript", "Python", "React", "Next.js"] },
];

const KNOWN = new Set(stack.flatMap((g) => g.items));

export function StackIndex() {
  return (
    <div className="relative md:max-w-[52%]">
      <Scrim shape="hold" strength={0.84} inset="-12% -22% -12% -28px" />
      <p className="label !text-[12px] !text-ink/70">What I reach for</p>
      <dl className="mt-4 border-b border-hairline">
        {LINES.map((line) => (
          <FadeIn key={line.name} className="grid gap-x-[var(--gutter)] gap-y-2 border-t border-hairline py-3 md:grid-cols-[9.5rem_1fr] md:py-4">
            <dt className="label !text-[12px] !text-ink/70 md:pt-[0.55em]">{line.name}</dt>
            <dd>
              <ul className="flex flex-wrap items-baseline gap-x-[1.5em] gap-y-1 text-[clamp(1rem,1.4vw,1.25rem)] leading-[1.35] tracking-[-0.02em] text-ink [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
                {line.items
                  .filter((item) => KNOWN.has(item))
                  .map((item) => (
                    <li key={item}>{item}</li>
                  ))}
              </ul>
            </dd>
          </FadeIn>
        ))}
      </dl>
    </div>
  );
}
