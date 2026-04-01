"use client";

import type { Milestone } from "@/data/timeline";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { RevealText } from "@/components/ui/RevealText";

interface TimelineChapterProps {
  milestone: Milestone;
  index: number;
}

/**
 * Parse a metric value string into parts for AnimatedCounter.
 * Handles formats like "20K+", "87.34%", "3.83", "$16K total",
 * "1.2 -> 4.5", "2nd / 3,300+", "40%", "14".
 * Falls back to plain text if no leading number is found.
 */
function parseMetricValue(raw: string): {
  numericValue: number | null;
  prefix: string;
  suffix: string;
} {
  // Try to extract a leading number (with optional $ prefix)
  const match = raw.match(/^(\$?)([\d,]+(?:\.\d+)?)(.*)/);
  if (!match) {
    return { numericValue: null, prefix: "", suffix: raw };
  }

  const prefix = match[1];
  const numStr = match[2].replace(/,/g, "");
  const numericValue = parseFloat(numStr);
  let suffix = match[3];

  // Handle "K" multiplier in suffix
  if (suffix.startsWith("K")) {
    return {
      numericValue: numericValue * 1000,
      prefix,
      suffix: suffix.replace(/^K/, "K"),
    };
  }

  return { numericValue, prefix, suffix };
}

export function TimelineChapter({ milestone, index }: TimelineChapterProps) {
  const isEven = index % 2 === 0;
  const revealDirection = isEven ? "left" : "up";

  return (
    <RevealText direction={revealDirection} delay={index * 0.1}>
      <div
        className={cn(
          "rounded-xl p-6 md:p-8 w-full max-w-lg",
          "bg-[var(--bg-surface)] border-l-2 transition-colors duration-300"
        )}
        style={{ borderLeftColor: milestone.accentColor ?? "var(--accent-warm)" }}
      >
        {/* Year badge */}
        <span
          className="text-caption inline-block mb-3 px-3 py-1 rounded-full"
          style={{
            color: milestone.accentColor ?? "var(--accent-light)",
            backgroundColor: `${milestone.accentColor ?? "var(--accent)"}15`,
          }}
        >
          {milestone.year}
        </span>

        {/* Title & subtitle */}
        <h3 className="text-h3 text-[var(--text-primary)] mb-1">
          {milestone.title}
        </h3>
        <p className="text-[var(--text-secondary)] text-sm mb-3">
          {milestone.subtitle}
        </p>

        {/* Description */}
        <p className="text-body text-[var(--text-secondary)] text-base leading-relaxed mb-5">
          {milestone.description}
        </p>

        {/* Metrics */}
        {milestone.metrics && milestone.metrics.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {milestone.metrics.map((metric) => {
              const parsed = parseMetricValue(metric.value);
              return (
                <div
                  key={metric.label}
                  className={cn(
                    "flex flex-col items-center px-4 py-3 rounded-xl",
                    "bg-[var(--bg-surface)] border border-[var(--bg-border)]"
                  )}
                >
                  <span className="text-lg font-semibold text-[var(--text-primary)]">
                    {parsed.numericValue !== null ? (
                      <AnimatedCounter
                        value={parsed.numericValue}
                        prefix={parsed.prefix}
                        suffix={parsed.suffix}
                        duration={1200}
                      />
                    ) : (
                      metric.value
                    )}
                  </span>
                  <span className="text-xs text-[var(--text-tertiary)] mt-0.5">
                    {metric.label}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </RevealText>
  );
}
