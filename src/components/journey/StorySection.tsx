"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { timeline } from "@/data/timeline";
import { profile } from "@/data/profile";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { RevealText } from "@/components/ui/RevealText";
import { cn } from "@/lib/utils";

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/**
 * The narrative arc, framed as a git commit history.
 * Each milestone is a "commit" on a vertical branch line — mono hash,
 * relative time, a shipped/merged verb, and a first-person line.
 * The metrics count up via AnimatedCounter when scrolled into view.
 */

// First-person framing for each timeline beat — Manvir-warm, confident.
const commitMeta: Record<
  string,
  { hash: string; rel: string; verb: string; voice: string; numbers?: NumberStat[] }
> = {
  bangalore: {
    hash: "a1f0c2e",
    rel: "the beginning",
    verb: "shipped",
    voice:
      "I started in Bangalore, writing Flutter and pushing an ERP app that real students opened every morning. We dragged the rating off the floor — and I learned that software only matters when people actually depend on it.",
    numbers: [
      { value: 20, suffix: "K+", label: "daily users" },
      { value: 1.2, suffix: " → 4.5", label: "app rating", from: "1.2" },
      { value: 87.34, suffix: "%", label: "fraud-model accuracy" },
    ],
  },
  northeastern: {
    hash: "3b9d7a4",
    rel: "crossed an ocean",
    verb: "merged",
    voice:
      "Then I packed two suitcases and moved 8,000 miles to Boston for an M.S. in AI at Northeastern. Computer vision, NLP, deep learning — and a 3.83 GPA to show I meant it.",
    numbers: [{ value: 3.83, label: "GPA" }],
  },
  coop: {
    hash: "c4e1b88",
    rel: "first AI at scale",
    verb: "shipped",
    voice:
      "At the Burnes Center I launched GENIE — a secure multi-model AI sandbox that 44K state employees now reach for. A smart router across 14 models cut our costs by 40%. I got to demo it to the Governor.",
    numbers: [
      { value: 44, suffix: "K+", label: "state employees" },
      { value: 40, suffix: "%", label: "cost cut" },
      { value: 14, label: "models routed" },
    ],
  },
  fulltime: {
    hash: "e7a2f31",
    rel: "took the lead",
    verb: "merged",
    voice:
      "I stepped up as Technical Lead — owning A-IEP for 1,000+ families, building a Voice Survey Agent, and mentoring 50+ engineers. One-L cut legal review time by 83% and took home a NASPO Gold Award.",
    numbers: [
      { value: 50, suffix: "+", label: "engineers mentored" },
      { value: 83, suffix: "%", label: "legal review cut" },
      { value: 1000, suffix: "+", label: "families helped" },
    ],
  },
  scale: {
    hash: "HEAD",
    rel: "now",
    verb: "scaling",
    voice:
      "Today I architect a reusable RAG platform behind 26 AI tools, deployed across 20+ government agencies. It quietly serves half a million people — which is the whole point.",
    numbers: [
      { value: 26, label: "AI tools" },
      { value: 20, suffix: "+", label: "agencies" },
      { value: 500, suffix: "K+", label: "people served" },
    ],
  },
};

interface NumberStat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  from?: string;
}

// Only the SWE→AI throughline beats (skip the VCT side-quest here).
const beats = timeline.filter((m) => m.id !== "vct");

// Map timeline ids to a representative experience chip.
const chipFor: Record<string, { role: string; company: string; kind: string }> = {
  bangalore: {
    role: "Software Engineer · Flutter",
    company: "Acharya Institutes",
    kind: "swe",
  },
  northeastern: {
    role: "M.S. Artificial Intelligence",
    company: "Northeastern University",
    kind: "ml",
  },
  coop: {
    role: "GenAI Product Co-op",
    company: "Burnes Center",
    kind: "ai",
  },
  fulltime: {
    role: "Generative AI Engineer & Technical Lead",
    company: "Burnes Center",
    kind: "ai",
  },
  scale: {
    role: "Technical Lead · AI for Impact",
    company: "Burnes Center",
    kind: "ai",
  },
};

const kindAccent: Record<string, string> = {
  swe: "var(--accent-teal)",
  ml: "var(--accent-purple)",
  ai: "var(--accent)",
};

function Commit({ id }: { id: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.4 });
  const beat = beats.find((b) => b.id === id)!;
  const meta = commitMeta[id];
  const chip = chipFor[id];
  const accent = kindAccent[chip.kind] ?? "var(--accent)";
  const isHead = meta.hash === "HEAD";

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 28 }}
      animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 28 }}
      transition={{ duration: 0.6, ease: EXPO_OUT }}
      className="relative pl-10 md:pl-14 pb-14 md:pb-20 last:pb-0"
    >
      {/* Commit dot */}
      <span
        className="absolute left-[6px] md:left-[10px] top-1.5 z-10 block h-3 w-3 -translate-x-1/2 rounded-full"
        style={{
          background: isHead ? accent : "var(--bg-primary)",
          border: `1.5px solid ${accent}`,
          boxShadow: isHead ? `0 0 0 4px ${"rgba(232,132,92,0.12)"}` : "none",
        }}
        aria-hidden
      />

      {/* Mono commit line */}
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="label-mono" style={{ color: accent }}>
          {meta.verb}
        </span>
        <span className="font-mono text-[0.7rem] text-[var(--text-tertiary)]">
          {meta.hash}
        </span>
        <span className="font-mono text-[0.7rem] text-[var(--text-faint)]">
          · {beat.year} · {meta.rel}
        </span>
      </div>

      {/* Title */}
      <h3 className="text-h3 text-[var(--text-primary)] mt-3">
        {beat.title}
        {isHead && (
          <span
            className="ml-3 align-middle font-mono text-[0.6rem] tracking-[0.18em] uppercase px-2 py-0.5 rounded"
            style={{
              color: accent,
              border: "1px solid var(--hairline-strong)",
            }}
          >
            HEAD
          </span>
        )}
      </h3>

      {/* Role / company chip */}
      <div className="mt-2 flex flex-wrap items-center gap-2 font-mono text-[0.72rem] text-[var(--text-secondary)]">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full"
          style={{ background: accent }}
          aria-hidden
        />
        <span className="text-[var(--text-primary)]">{chip.role}</span>
        <span className="text-[var(--text-faint)]">@</span>
        <span className="text-[var(--text-tertiary)]">{chip.company}</span>
      </div>

      {/* First-person voice */}
      <p className="text-body mt-4 max-w-[58ch]">{meta.voice}</p>

      {/* Metrics row — count up */}
      {meta.numbers && (
        <div className="mt-6 flex flex-wrap gap-x-10 gap-y-5">
          {meta.numbers.map((n) => (
            <div key={n.label}>
              <div
                className="num-display text-[clamp(1.6rem,3.5vw,2.4rem)]"
                style={{ color: "var(--text-primary)" }}
              >
                <AnimatedCounter
                  value={n.value}
                  prefix={n.prefix}
                  suffix={n.suffix}
                />
              </div>
              <div className="label-mono mt-1">{n.label}</div>
            </div>
          ))}
        </div>
      )}
    </motion.div>
  );
}

export function StorySection() {
  const lineRef = useRef<HTMLDivElement>(null);
  const lineInView = useInView(lineRef, { once: true, amount: 0.05 });

  return (
    <section id="story" className="section py-24 md:py-32">
      {/* Eyebrow + heading */}
      <RevealText direction="up">
        <p className="label-mono mb-4">git log --reverse · the arc</p>
      </RevealText>
      <RevealText direction="up" delay={0.05}>
        <h2 className="text-h2 text-[var(--text-primary)] max-w-[20ch]">
          From a Flutter app in Bangalore to AI for{" "}
          <span style={{ color: "var(--accent)" }}>half a million people.</span>
        </h2>
      </RevealText>
      <RevealText direction="up" delay={0.1}>
        <p className="text-body mt-5 max-w-[56ch]">
          {profile.yearsExperience} years of shipping, told as commits — each
          one something real people came to depend on.
        </p>
      </RevealText>

      {/* The branch */}
      <div ref={lineRef} className="relative mt-16 md:mt-20">
        {/* Vertical branch line — draws in on scroll, static under reduced motion */}
        <motion.span
          aria-hidden
          className="absolute left-[6px] md:left-[10px] top-1 bottom-1 w-px origin-top"
          style={{
            background:
              "linear-gradient(to bottom, var(--accent), var(--hairline-strong) 80%, transparent)",
          }}
          initial={{ scaleY: 0 }}
          animate={lineInView ? { scaleY: 1 } : { scaleY: 0 }}
          transition={{ duration: 1.4, ease: EXPO_OUT }}
        />

        {beats.map((b) => (
          <Commit key={b.id} id={b.id} />
        ))}
      </div>

      {/* Footer caption — origin → now */}
      <div
        className={cn(
          "mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 pl-10 md:pl-14",
          "font-mono text-[0.7rem] text-[var(--text-tertiary)]"
        )}
      >
        <span>{profile.origin}</span>
        <span className="text-[var(--text-faint)]">→</span>
        <span style={{ color: "var(--accent)" }}>{profile.location}</span>
      </div>
    </section>
  );
}
