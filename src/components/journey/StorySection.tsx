"use client";

import { useRef, useState } from "react";
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
// Only the pre-AI era keeps its metric blocks here; the Burnes-era numbers
// live once, with the case studies and the impact tally further down.
const commitMeta: Record<
  string,
  { hash: string; rel: string; verb: string; voice: string; numbers?: NumberStat[] }
> = {
  bangalore: {
    hash: "a1f0c2e",
    rel: "day one",
    verb: "init",
    voice:
      "I started in Bangalore writing Flutter — an ERP app that real students opened every morning, plus a CNN fraud-detection model built on the side for a fintech startup. We dragged the app's rating off the floor, and I learned that software only matters when people depend on it.",
    numbers: [
      { value: 20, suffix: "K+", label: "daily users" },
      { value: 1.2, suffix: " → 4.5", label: "app rating" },
      { value: 87.34, suffix: "%", label: "fraud-model accuracy", decimals: 2 },
    ],
  },
  northeastern: {
    hash: "3b9d7a4",
    rel: "8,000 miles in",
    verb: "merged",
    voice:
      "Then I packed two suitcases and moved to Boston for an M.S. in AI at Northeastern — computer vision, NLP, deep learning. I treated grad school like a job I couldn't afford to lose.",
    numbers: [{ value: 3.83, label: "GPA", decimals: 2 }],
  },
  coop: {
    hash: "c4e1b88",
    rel: "first AI at scale",
    verb: "shipped",
    voice:
      "At the Burnes Center I launched GENIE — a secure sandbox that gave Massachusetts state employees a safe way to use generative AI, with a router quietly picking the right model for every query. I got to demo it to the Governor.",
  },
  fulltime: {
    hash: "e7a2f31",
    rel: "the step up",
    verb: "released",
    voice:
      "I stepped up as Technical Lead — A-IEP, so families can read their kids' education plans in plain language; a voice agent that surveys residents over the phone; and a bench of engineers I mentored from prototype to launch. One-L turned days of legal review into hours.",
  },
  scale: {
    hash: "HEAD",
    rel: "now",
    verb: "scaling",
    voice:
      "Today I architect the reusable RAG platform the rest of the program stands on, deployed across state and municipal agencies. The numbers live below, next to the work that earned them.",
  },
};

interface NumberStat {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  /** Decimal places for non-integer values (AnimatedCounter default: 1). */
  decimals?: number;
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

/** A real moment attached to a commit — quiet hairline frame + mono caption.
 *  Hides itself entirely until the photo file exists in /public/photos. */
function CommitPhoto({
  src,
  alt,
  caption,
}: {
  src: string;
  alt: string;
  caption?: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) return null;
  return (
    <figure className="mt-6 max-w-[400px]">
      <div className="tile overflow-hidden" style={{ transform: "rotate(-0.6deg)" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className="block w-full object-cover"
          onError={() => setFailed(true)}
        />
      </div>
      {caption && (
        <figcaption className="mt-2 font-mono text-[0.68rem] leading-relaxed text-[var(--text-tertiary)]">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}

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

      {/* A real moment from this chapter (renders once the photo exists) */}
      {beat.photo && (
        <CommitPhoto
          src={beat.photo}
          alt={beat.photoAlt ?? beat.title}
          caption={beat.photoCaption}
        />
      )}

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
                  decimals={n.decimals}
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
          From a Flutter app in Bangalore to AI in the{" "}
          <span style={{ color: "var(--accent)" }}>statehouse.</span>
        </h2>
      </RevealText>
      <RevealText direction="up" delay={0.1}>
        <p className="text-body mt-5 max-w-[56ch]">
          {profile.yearsExperience} years in five commits — side quests
          omitted.
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
