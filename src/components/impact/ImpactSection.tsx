"use client";

import { impactMetrics, awards } from "@/data/impact";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { RevealText } from "@/components/ui/RevealText";
import { Trophy } from "lucide-react";

export function ImpactSection() {
  return (
    <section id="impact" className="section py-24 md:py-32">
      {/* Section heading */}
      <RevealText direction="up">
        <div className="text-center mb-16 md:mb-24">
          <p className="text-caption mb-3 text-[var(--accent-light)]">
            BY THE NUMBERS
          </p>
          <h2 className="text-h1 text-[var(--text-primary)]">Impact</h2>
        </div>
      </RevealText>

      {/* Metrics grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-20">
        {impactMetrics.map((metric, idx) => (
          <RevealText key={metric.id} direction="up" delay={idx * 0.08}>
            <div
              className={cn(
                "glass-sm rounded-2xl p-6 text-center",
                "hover:border-[var(--accent)]/20 transition-colors duration-300"
              )}
            >
              <div className="text-h2 font-bold text-[var(--text-primary)] mb-2">
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
              <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                {metric.label}
              </p>
              <p className="text-xs text-[var(--text-tertiary)] leading-relaxed">
                {metric.description}
              </p>
            </div>
          </RevealText>
        ))}
      </div>

      {/* Awards section */}
      <RevealText direction="up" delay={0.2}>
        <div className="text-center mb-10">
          <h3 className="text-h3 text-[var(--text-primary)]">
            Recognition
          </h3>
        </div>
      </RevealText>

      <div className="flex flex-wrap justify-center gap-4">
        {awards.map((award, idx) => (
          <RevealText key={award.id} direction="up" delay={0.3 + idx * 0.1}>
            <div
              className={cn(
                "flex items-center gap-3 px-5 py-3 rounded-xl",
                "border transition-colors duration-300"
              )}
              style={{
                backgroundColor: "rgba(245, 158, 11, 0.05)",
                borderColor: "rgba(245, 158, 11, 0.15)",
              }}
            >
              <Trophy className="w-4 h-4 flex-shrink-0 text-[#F59E0B]" />
              <div className="text-left">
                <p className="text-sm font-medium text-[#F59E0B]">
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
