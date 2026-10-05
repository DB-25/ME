import usage from "./agent-usage.json";

const n = (v: number) => v.toLocaleString("en-US");
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "5 Oct 2026", the site's own date style (Intl en-GB spells September "Sept"). */
const day = (iso: string) => {
  const [y, m, d] = iso.split("-").map(Number);
  return `${d} ${MONTHS[(m ?? 1) - 1]} ${y}`;
};

/**
 * The "Built with agents" figures as plain sentences, read from the generated agent-usage.json (scripts/agent-usage.mjs),
 * so the Director can answer questions about them. Self-reported: counted from Claude Code logs on my own Mac.
 */
export const agentUsage = {
  basis: "Self-reported, counted from local Claude Code logs. Covers only the logs on one Mac, so earlier work is not in them.",
  window: `${day(usage.from)} to ${day(usage.to)}`,
  facts: [
    `${n(usage.activeDays)} active days, ${n(usage.sessions)} sessions, ${n(usage.subagents)} subagent threads`,
    `${n(usage.toolCalls)} tool calls in ${n(usage.turns)} model turns, plus ${n(usage.prompts)} prompts written by me`,
    `${(usage.tokens.output / 1e6).toFixed(1)}M output tokens. Total tokens were ${(usage.tokens.total / 1e9).toFixed(2)}B, ${(usage.tokens.cacheShare * 100).toFixed(1)}% of it cached context read back in, so output tokens are the headline figure`,
    `Busiest day ${day(usage.busiest.day)}, ${n(usage.busiest.turns)} model turns`,
    "This portfolio and arc-control-mcp were built with agents",
  ],
};
