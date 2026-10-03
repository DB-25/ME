import type { Metric } from "@/content";

const format = (n: number, suffix = "") => `${n.toLocaleString("en-US")}${suffix}`;

/** A huge tabular number. Always the final value: it never counts, the surrounding FadeIn does the reveal. */
export function Counter({ metric, className }: { metric: Metric; className: string }) {
  const final = metric.numeric === undefined ? metric.value : format(metric.numeric, metric.suffix);
  return (
    <span className="relative block">
      <span className={`num block ${className}`}>{final}</span>
    </span>
  );
}
