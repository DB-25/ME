import type { CSSProperties } from "react";
import Link from "next/link";
import { SRC } from "@/content/sources";
import { Reveal } from "@/components/ui/Reveal";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";
import { BasisTag } from "../impact/BasisTag";
import { sourceRef } from "../impact/source";
import { fmt, heat, usage } from "./agentActivity";

const SHADOW = "[text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]";
const PROVENANCE = { source: SRC.agentLogs, basis: "self" } as const;
const CASE_STUDY = "/work/arc-control-mcp/";

const { claudeCode, cursor } = usage.tools;
const STATS = [
  { label: "Tool calls", value: fmt.count(usage.toolCalls), note: `in ${fmt.count(usage.turns)} model turns` },
  { label: "Sessions", value: fmt.count(usage.sessions), note: `plus ${fmt.count(usage.subagents)} subagents` },
  { label: "Active days", value: fmt.count(usage.activeDays), note: `of ${fmt.count(heat.spanDays)} in the window` },
  { label: "Output tokens", value: fmt.compact(usage.tokens.output, 1), note: `Claude Code, from ${fmt.count(claudeCode.prompts)} prompts` },
];

const SUMMARY = `Activity strip, ${heat.window}: ${fmt.count(usage.activeDays)} active days out of ${fmt.count(heat.spanDays)}. The busiest day was ${heat.busiestDay}, with ${fmt.count(usage.busiest.turns)} model turns. Each day is shaded by how many turns the agents took.`;

/**
 * Closes the chapter on how I work with agents. The activity strip and four counts come from agent-usage.json
 * (scripts/agent-usage.mjs reads my own Claude Code logs and Cursor chat history), so re-running the script updates the page. Nothing here
 * is hand-typed except the wording. Server-rendered: the strip is plain CSS grid cells.
 */
export function AgentsPanel() {
  const ref = sourceRef(SRC.agentLogs);
  return (
    <div className="relative md:max-w-[52%]">
      <Scrim shape="hold" strength={0.9} inset="-6% -22% -6% -28px" />
      <h3 className="label !text-[12px] !text-ink/70">Built with agents</h3>
      <Reveal as="p" className="mt-4 text-[clamp(1.125rem,1.7vw,1.5rem)] font-medium leading-[1.25] tracking-[-0.02em] text-ink text-balance">
        Building with agents since {heat.sinceMonth}. Here is the log.
      </Reveal>

      <FadeIn className="mt-6 border-t border-hairline pt-4 md:mt-8">
        <p className="sr-only">{SUMMARY}</p>
        <div aria-hidden className="ag-wrap" style={{ "--ag-weeks": heat.weeks } as CSSProperties}>
          <div className="ag-months label !text-[12px] !text-dim">
            {heat.months.map((m) => (
              <span key={m.label} className="whitespace-nowrap" style={{ gridColumn: m.column }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="ag-grid">
            {heat.cells.map((c) => (
              <span key={c.key} className="ag-cell" data-l={c.level} {...(c.inRange ? {} : { "data-out": "" })} />
            ))}
          </div>
          <p className="label mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-1 !text-[12px] !text-dim">
            <span className="flex items-center gap-2">
              Less
              {[0, 1, 2, 3, 4].map((l) => (
                <span key={l} className="ag-swatch" data-l={l} />
              ))}
              More
            </span>
            <span>Busiest day {heat.busiestDay}</span>
          </p>
        </div>
      </FadeIn>

      <FadeIn delay={0.05}>
        <dl className="mt-6 grid grid-cols-2 gap-x-[var(--gutter)] gap-y-6 md:mt-8 md:grid-cols-4">
          {STATS.map((s) => (
            <div key={s.label} className="border-t border-hairline-strong pt-3">
              <dt className="label !text-[12px] !text-ink">{s.label}</dt>
              <dd className="mt-3">
                <span className={`num block text-[clamp(2.25rem,3vw,2.75rem)] font-medium leading-[0.9] tracking-[-0.055em] text-ink ${SHADOW}`}>{s.value}</span>
                <span className={`mt-2 block text-balance text-[0.875rem] leading-[1.4] text-ink/75 ${SHADOW}`}>{s.note}</span>
              </dd>
            </div>
          ))}
        </dl>
      </FadeIn>

      <FadeIn delay={0.05}>
        <p className={`mt-6 max-w-[34rem] text-[0.9375rem] leading-[1.55] text-ink/80 md:mt-8 ${SHADOW}`}>
          This site and{" "}
          <Link href={CASE_STUDY} data-cursor="open" className="link text-ink underline decoration-ink/25 underline-offset-[5px] hover:text-accent-hot focus-visible:text-accent-hot">
            arc-control-mcp
          </Link>
          , an MCP server on npm that lets agents drive the Arc browser, were built this way.
        </p>
        <p className="mt-3 flex flex-wrap items-baseline gap-x-4 gap-y-1">
          <BasisTag metric={PROVENANCE} />
          <span className="label !text-[12px] !text-ink/65">
            {ref.label}
            <span className="mx-2 text-dim" aria-hidden>
              /
            </span>
            <span className="whitespace-nowrap">{heat.window}</span>
          </span>
        </p>
        <p className={`mt-3 max-w-[34rem] text-[0.8125rem] leading-[1.55] text-ink/70 ${SHADOW}`}>
          Counted from what this Mac kept: {fmt.count(cursor?.chats ?? 0)} Cursor chats and {fmt.count(claudeCode.sessions)} Claude Code sessions. Claude Code logs
          only go back to {heat.claudeSince}, and Cursor does not record tokens, so the token figure is Claude Code alone. Its total was{" "}
          {fmt.compact(usage.tokens.total, 2)}, but {fmt.percent(usage.tokens.cacheShare)} of that is cached context read back in on each turn, which is
          why output tokens are the figure above.
        </p>
      </FadeIn>
    </div>
  );
}
