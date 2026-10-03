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
    <div className="relative">
      <Scrim strength={0.78} inset="-12% -4%" />
      <p className="label">What I reach for</p>
      <dl className="mt-6 border-b border-hairline">
        {LINES.map((line) => (
          <FadeIn key={line.name} className="grid gap-x-[var(--gutter)] gap-y-2 border-t border-hairline py-5 md:grid-cols-[14rem_1fr] md:py-6">
            <dt className="label md:pt-[0.7em]">{line.name}</dt>
            <dd>
              <ul className="flex flex-wrap items-baseline gap-x-[0.9em] gap-y-1 text-[clamp(1.125rem,1.8vw,1.625rem)] leading-[1.35] tracking-[-0.02em] text-ink">
                {line.items
                  .filter((item) => KNOWN.has(item))
                  .map((item, i, all) => (
                    <li key={item} className="flex items-baseline gap-x-[0.9em]">
                      {item}
                      {i < all.length - 1 && (
                        <span aria-hidden className="text-faint">
                          /
                        </span>
                      )}
                    </li>
                  ))}
              </ul>
            </dd>
          </FadeIn>
        ))}
      </dl>
    </div>
  );
}
