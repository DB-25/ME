import { BASIS, basisOf, type Metric } from "@/content";

/** Dot colour per basis: third party is the brightest, my own word is the warm one, the repo is quiet. */
const DOT: Record<keyof typeof BASIS, string> = {
  "third-party": "var(--color-accent-hot)",
  employer: "var(--color-accent)",
  self: "var(--color-saffron)",
  repo: "var(--color-dim)",
};

/** Who stands behind a figure: third party, my employer, me, or the repo. Always shown, so a number never travels without its basis. */
export function BasisTag({ metric, className = "" }: { metric: Pick<Metric, "source" | "basis">; className?: string }) {
  const basis = basisOf(metric);
  return (
    <span className={`label inline-flex items-center gap-2 !text-[12px] !text-ink ${className}`} title={BASIS[basis].meaning}>
      <span aria-hidden className="inline-block h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: DOT[basis] }} />
      {BASIS[basis].label}
    </span>
  );
}
