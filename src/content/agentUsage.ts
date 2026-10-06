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
 * so the Director can answer questions about them. Self-reported: counted from my Claude Code logs and Cursor chat history.
 */
export const agentUsage = {
  basis: "Self-reported, from local Claude Code, Codex and Cursor history on one Mac. Claude Code logs start later than Cursor's. Claude Code and Codex record tokens; Cursor kept them for only some chats, so its share of the all-tools range is extended from those chats' rates.",
  window: `${day(usage.from)} to ${day(usage.to)}`,
  facts: [
    `${n(usage.activeDays)} active days, ${n(usage.sessions)} sessions and chats (${n(usage.tools.claudeCode.sessions)} in Claude Code, ${n(usage.tools.cursor?.chats ?? 0)} in Cursor, ${n(usage.tools.codex?.sessions ?? 0)} in Codex), ${n(usage.subagents)} subagent threads`,
    `Across Claude Code, Cursor and Codex, roughly ${Math.round(usage.allTools.low.tokens / 1e9)}B to ${Math.round(usage.allTools.high.tokens / 1e9)}B tokens in total, nearly all cached context`,
    `${n(usage.toolCalls)} tool calls in ${n(usage.turns)} model turns, plus ${n(usage.prompts)} prompts written by me`,
    `${(usage.tokens.output / 1e6).toFixed(1)}M output tokens in Claude Code (Cursor does not record tokens). Total tokens were ${(usage.tokens.total / 1e9).toFixed(2)}B, ${(usage.tokens.cacheShare * 100).toFixed(1)}% of it cached context read back in, so output tokens are the headline figure`,
    `Busiest day ${day(usage.busiest.day)}, ${n(usage.busiest.turns)} model turns`,
    "This portfolio and arc-control-mcp were built with agents",
  ],
};
