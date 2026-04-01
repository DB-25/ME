"use client";

import { impactMetrics, awards } from "@/data/impact";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { RevealText } from "@/components/ui/RevealText";
import { Trophy } from "lucide-react";

export function ImpactSection() {
  return (
    <section id="impact" className="section py-24 md:py-32">
      {/* Section heading — understated */}
      <RevealText direction="up">
        <div className="mb-16 md:mb-24">
          <h2 className="text-h2 text-[var(--text-primary)]">The numbers</h2>
        </div>
      </RevealText>

      {/* Floating metrics — no card containers */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-12 mb-20">
        {impactMetrics.map((metric, idx) => (
          <RevealText key={metric.id} direction="up" delay={idx * 0.08}>
            <div className="text-left">
              <div
                className="text-h1 font-bold mb-1"
                style={{ color: idx % 2 === 0 ? "var(--text-primary)" : "var(--accent-warm)" }}
              >
                {metric.numericValue != null ? (
                  <AnimatedCounter
                    value={metric.numericValue}
                    prefix={metric.prefix}
                    suffix={metric.suffix}
                    duration={1500}
                  />
                ) : (
                  metric.value
                )}
              </div>
              <p className="text-sm font-medium text-[var(--text-secondary)] mb-0.5">
                {metric.label}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed max-w-[200px]">
                {metric.description}
              </p>
            </div>
          </RevealText>
        ))}
      </div>

      {/* Awards */}
      <RevealText direction="up" delay={0.2}>
        <div className="mb-8">
          <h3 className="text-h3 text-[var(--text-primary)]">Recognition</h3>
        </div>
      </RevealText>

      <div className="flex flex-wrap gap-4">
        {awards.map((award, idx) => (
          <RevealText key={award.id} direction="up" delay={0.3 + idx * 0.1}>
            <div
              className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-xl",
                "border transition-colors duration-300"
              )}
              style={{
                backgroundColor: "rgba(232, 132, 92, 0.05)",
                borderColor: "rgba(232, 132, 92, 0.15)",
              }}
            >
              <Trophy className="w-4 h-4 flex-shrink-0 text-[var(--accent-warm)]" />
              <div className="text-left">
                <p className="text-sm font-medium text-[var(--accent-warm)]">
                  {award.title}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">
                  {award.year} &middot; {award.issuer}
                </p>
              </div>
            </div>
          </RevealText>
        ))}
      </div>
    </section>
  );
}
