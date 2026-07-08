"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { impactMetrics, awards } from "@/data/impact";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { RevealText } from "@/components/ui/RevealText";
import { cn } from "@/lib/utils";

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Big num-display metrics that count up on scroll, laid out asymmetrically
 * (a hero metric, then a varied bento) — not a uniform 4-col grid. Each metric
 * carries its one-line "how". Awards land below as quiet hairline rows.
 */

// Lead metric gets the full-width treatment; the rest flow in a varied grid.
const [lead, ...rest] = impactMetrics;

// Sparse categorical accent — terracotta on the lead + a couple of pivots.
const accentIds = new Set(["users", "benefits", "hackathon"]);

function Metric({
  id,
  value,
  numericValue,
  prefix,
  suffix,
  label,
  description,
  size = "md",
  delay = 0,
}: {
  id: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  description: string;
  size?: "lead" | "md";
  delay?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const accent = accentIds.has(id);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 22 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }}
      transition={{ duration: 0.55, ease: EXPO_OUT, delay }}
    >
      <div
        className={cn(
          "num-display",
          size === "lead"
            ? "text-[clamp(3.5rem,10vw,7rem)]"
            : "text-[clamp(2.25rem,5vw,3.75rem)]"
        )}
        style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}
      >
        {numericValue != null ? (
          <AnimatedCounter
            value={numericValue}
            prefix={prefix}
            suffix={suffix}
            duration={1800}
          />
        ) : (
          value
        )}
      </div>
      <p
        className={cn(
          "font-medium text-[var(--text-primary)]",
          size === "lead" ? "text-h3 mt-3" : "text-base mt-2"
        )}
      >
        {label}
      </p>
      <p className="text-sm text-[var(--text-tertiary)] mt-1 max-w-[34ch]">
        {description}
      </p>
    </motion.div>
  );
}

function AwardRow({
  award,
  index,
}: {
  award: (typeof awards)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 12 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ duration: 0.5, ease: EXPO_OUT, delay: index * 0.08 }}
      className="group grid grid-cols-[4.5rem_1fr] items-baseline gap-x-4 py-5 hairline-b first:hairline-t md:grid-cols-[5rem_1fr_auto]"
    >
      <span className="font-mono text-[0.8rem] text-[var(--text-tertiary)]">
        {award.year}
      </span>
      <span className="text-[var(--text-primary)] transition-colors duration-200 group-hover:text-[var(--accent-light)]">
        {award.title}
      </span>
      <span className="col-start-2 mt-1 font-mono text-[0.72rem] text-[var(--text-tertiary)] md:col-start-3 md:mt-0 md:text-right">
        {award.issuer}
      </span>
    </motion.div>
  );
}

export function ImpactSection() {
  return (
    <section id="impact" className="section py-24 md:py-32">
      <RevealText direction="up">
        <p className="label-mono mb-4">the proof</p>
      </RevealText>
      <RevealText direction="up" delay={0.05}>
        <h2 className="text-h2 text-[var(--text-primary)] max-w-[16ch]">
          Numbers that left the building.
        </h2>
      </RevealText>

      {/* Lead metric — large, breathing room */}
      <div className="mt-16 md:mt-20">
        <Metric {...lead} size="lead" />
      </div>

      {/* Remaining metrics — asymmetric bento, hairline-divided columns */}
      <div className="mt-16 grid grid-cols-1 gap-x-10 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((m, i) => (
          <Metric key={m.id} {...m} delay={i * 0.06} />
        ))}
      </div>

      {/* Recognition — quiet hairline rows */}
      <div className="mt-24 md:mt-28">
        <RevealText direction="up">
          <p className="label-mono mb-6">recognition</p>
        </RevealText>
        <div className="max-w-3xl">
          {awards.map((a, i) => (
            <AwardRow key={a.id} award={a} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
