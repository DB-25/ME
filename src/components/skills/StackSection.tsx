"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { skills, skillCategories } from "@/data/skills";
import { RevealText } from "@/components/ui/RevealText";
import { cn } from "@/lib/utils";

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * Editorial bento of the 5 skill categories.
 * Each category is a hairline .tile with a color dot + mono label and its
 * tools as understated mono tags separated by middots — deliberately NOT
 * uniform MUI pills. Tile sizes vary for a real bento rhythm.
 */

// Asymmetric column spans (12-col grid) — intentional, not uniform.
const spanFor: Record<string, string> = {
  llm: "md:col-span-7",
  cloud: "md:col-span-5",
  languages: "md:col-span-4",
  data: "md:col-span-3",
  frameworks: "md:col-span-5",
};

function CategoryTile({
  cat,
  index,
}: {
  cat: (typeof skillCategories)[number];
  index: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.25 });
  const items = skills.filter((s) => s.category === cat.id);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: EXPO_OUT, delay: index * 0.06 }}
      className={cn(
        "tile group relative p-6 md:p-7 flex flex-col",
        spanFor[cat.id] ?? "md:col-span-4"
      )}
    >
      {/* Header: color dot + mono label + count */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span
            className="block h-2 w-2 rounded-full transition-transform duration-300 group-hover:scale-125"
            style={{ background: cat.color }}
            aria-hidden
          />
          <span className="label-mono text-[var(--text-secondary)]">
            {cat.label}
          </span>
        </div>
        <span className="font-mono text-[0.7rem] text-[var(--text-faint)]">
          {String(items.length).padStart(2, "0")}
        </span>
      </div>

      {/* Tools — understated mono tags split by middots */}
      <div className="flex flex-wrap items-center gap-x-1 gap-y-2.5">
        {items.map((s, i) => (
          <span key={s.name} className="inline-flex items-center">
            <span
              className={cn(
                "font-mono text-[0.8rem] leading-none transition-colors duration-200",
                s.proficiency >= 0.9
                  ? "text-[var(--text-primary)]"
                  : "text-[var(--text-secondary)]"
              )}
            >
              {s.name}
            </span>
            {i < items.length - 1 && (
              <span
                className="mx-2 select-none text-[var(--text-faint)]"
                aria-hidden
              >
                ·
              </span>
            )}
          </span>
        ))}
      </div>

      {/* Hairline accent on hover — a quiet underline in the category color */}
      <span
        className="pointer-events-none absolute left-0 bottom-0 h-px w-full origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100"
        style={{ background: cat.color, opacity: 0.5 }}
        aria-hidden
      />
    </motion.div>
  );
}

export function StackSection() {
  return (
    <section id="stack" className="section py-24 md:py-32">
      <RevealText direction="up">
        <p className="label-mono mb-4">the toolkit</p>
      </RevealText>
      <RevealText direction="up" delay={0.05}>
        <h2 className="text-h2 text-[var(--text-primary)] max-w-[18ch]">
          The stack behind the systems.
        </h2>
      </RevealText>
      <RevealText direction="up" delay={0.1}>
        <p className="text-body mt-5 max-w-[54ch]">
          Brightest names are the ones I reach for daily — the rest fill in the
          gaps when production asks for them.
        </p>
      </RevealText>

      <div className="mt-14 md:mt-16 grid grid-cols-1 md:grid-cols-12 gap-4">
        {skillCategories.map((cat, i) => (
          <CategoryTile key={cat.id} cat={cat} index={i} />
        ))}
      </div>
    </section>
  );
}
