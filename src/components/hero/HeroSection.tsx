"use client";

/**
 * HeroSection — the keynote-opening hero for Dhruv's portfolio.
 *
 * Editorial, asymmetric, one accent (terracotta). A 3D "system core" sits to
 * the right on desktop (only when motion is allowed); on mobile / reduced
 * motion it is swapped for a refined static memoji-in-a-hairline-ring poster.
 *
 * Actions trigger the AI Command Center three ways so it works regardless of
 * how the section is mounted:
 *   1. onAIClick?.()  — the prop the page already passes.
 *   2. window.dispatchEvent(new CustomEvent("dhruv:open-command"))
 *   3. document.getElementById("command")?.scrollIntoView(...)
 */

import { useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Image from "next/image";
import { motion, useReducedMotion } from "framer-motion";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";

// SystemCore mounts client-only (Three.js / WebGL has no SSR).
const SystemCore = dynamic(
  () => import("./SystemCore").then((m) => m.SystemCore),
  { ssr: false }
);

interface HeroSectionProps {
  /** Optional — the page passes this to open the command center directly. */
  onAIClick?: () => void;
}

// ---------------------------------------------------------------------------
// Smooth-scroll / command-center helpers.
// ---------------------------------------------------------------------------

function scrollToId(id: string) {
  if (typeof document === "undefined") return;
  const el = document.getElementById(id);
  if (!el) return;
  // Prefer Lenis (native scrollIntoView gets reset by smooth-scroll).
  const lenis = (window as unknown as { lenis?: { scrollTo: (t: HTMLElement, o?: object) => void } }).lenis;
  if (lenis) lenis.scrollTo(el, { offset: 0 });
  else el.scrollIntoView({ behavior: "smooth", block: "start" });
}

function openCommand(onAIClick?: () => void) {
  onAIClick?.();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("dhruv:open-command"));
  }
  scrollToId("command");
}

// ---------------------------------------------------------------------------
// Tagline with one accented word.
// ---------------------------------------------------------------------------

/** Renders profile.tagline ("Software that ships at scale.") with "scale"
 *  rendered in terracotta. */
function AccentedTagline() {
  const { before, accent, after } = useMemo(() => {
    const t = profile.tagline; // "Software that ships at scale."
    const target = "scale";
    const idx = t.toLowerCase().indexOf(target);
    if (idx === -1) return { before: t, accent: "", after: "" };
    return {
      before: t.slice(0, idx),
      accent: t.slice(idx, idx + target.length),
      after: t.slice(idx + target.length),
    };
  }, []);

  return (
    <span>
      {before}
      <span style={{ color: "var(--accent)" }}>{accent}</span>
      {after}
    </span>
  );
}

// ---------------------------------------------------------------------------
// At-a-glance stat row.
// ---------------------------------------------------------------------------

const STATS = [
  { value: "500K+", label: "people" },
  { value: "20+", label: "agencies" },
  { value: profile.yearsExperience, label: "yrs shipping" },
];

function StatRow() {
  return (
    <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2">
      {STATS.map((s, i) => (
        <div key={s.label} className="flex items-baseline gap-2">
          {i > 0 && (
            <span
              aria-hidden
              className="mr-3 text-[10px]"
              style={{ color: "var(--text-faint)" }}
            >
              ·
            </span>
          )}
          <span
            className="num-display text-[1.35rem]"
            style={{ color: "var(--accent)" }}
          >
            {s.value}
          </span>
          <span className="label-mono">{s.label}</span>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Static visual fallback — memoji inside a hairline ring + faint orbit.
// ---------------------------------------------------------------------------

function StaticCore({ className }: { className?: string }) {
  return (
    <div
      className={cn("relative flex items-center justify-center", className)}
      aria-hidden="true"
    >
      {/* Faint concentric orbits — echoes the 3D system core, statically. */}
      <div
        className="absolute rounded-full"
        style={{
          width: "min(78%, 360px)",
          aspectRatio: "1 / 1",
          border: "1px solid var(--hairline)",
        }}
      />
      <div
        className="absolute rounded-full"
        style={{
          width: "min(56%, 260px)",
          aspectRatio: "1 / 1",
          border: "1px solid var(--hairline-strong)",
        }}
      />
      {/* Memoji in a terracotta hairline ring. */}
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: "min(42%, 200px)",
          aspectRatio: "1 / 1",
          border: "1px solid var(--accent)",
          background: "var(--bg-surface)",
        }}
      >
        <Image
          src="/memoji.png"
          alt="Dhruv"
          fill
          sizes="200px"
          className="object-cover"
          priority
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component.
// ---------------------------------------------------------------------------

export function HeroSection({ onAIClick }: HeroSectionProps) {
  const reduce = useReducedMotion();

  // Decide whether to mount the 3D core: desktop + motion allowed only.
  // Resolved after mount to avoid SSR/client mismatch.
  const [show3D, setShow3D] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const decide = () =>
      setShow3D(
        mq.matches &&
          !window.matchMedia("(prefers-reduced-motion: reduce)").matches
      );
    decide();
    mq.addEventListener("change", decide);
    return () => mq.removeEventListener("change", decide);
  }, []);

  // Framer Motion stagger; reduced-motion shows everything immediately.
  const container = {
    hidden: {},
    show: {
      transition: reduce
        ? {}
        : { staggerChildren: 0.09, delayChildren: 0.05 },
    },
  };
  const item = reduce
    ? { hidden: { opacity: 1 }, show: { opacity: 1 } }
    : {
        hidden: { opacity: 0, y: 16 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const },
        },
      };

  return (
    <section
      id="top"
      className="relative w-full overflow-hidden"
      style={{ minHeight: "100svh" }}
    >
      <div className="relative mx-auto grid min-h-[100svh] w-full max-w-[1200px] grid-cols-1 items-center gap-10 px-6 py-24 md:grid-cols-[1.15fr_0.85fr] md:gap-8 md:px-8 lg:px-6">
        {/* ---- Text column ---- */}
        <motion.div
          variants={container}
          initial="hidden"
          animate="show"
          className="relative z-10 flex flex-col items-start"
        >
          {/* Eyebrow */}
          <motion.p variants={item} className="label-mono mb-7">
            Software Engineer · Boston · From Bangalore
          </motion.p>

          {/* Headline */}
          <motion.h1
            variants={item}
            className="text-display mb-6"
            style={{ color: "var(--text-primary)", maxWidth: "16ch" }}
          >
            <AccentedTagline />
          </motion.h1>

          {/* Positioning line */}
          <motion.p
            variants={item}
            className="text-body mb-9"
            style={{ maxWidth: "46ch" }}
          >
            {profile.positioningLine}
          </motion.p>

          {/* At-a-glance stats */}
          <motion.div variants={item} className="mb-10">
            <StatRow />
          </motion.div>

          {/* Actions — text links, no filled buttons */}
          <motion.div
            variants={item}
            className="flex flex-wrap items-center gap-x-8 gap-y-4"
          >
            <button
              type="button"
              onClick={() => openCommand(onAIClick)}
              className="link-grow text-[0.95rem]"
              style={{ color: "var(--text-primary)" }}
            >
              Explore the work →
            </button>
            <button
              type="button"
              onClick={() => scrollToId("story")}
              className="link-grow text-[0.95rem]"
            >
              Read the story →
            </button>
          </motion.div>
        </motion.div>

        {/* ---- Visual column ---- */}
        <motion.div
          initial={reduce ? false : { opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={
            reduce
              ? undefined
              : { duration: 1.1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }
          }
          className="relative flex h-[300px] items-center justify-center md:h-[460px] lg:h-[520px]"
        >
          {show3D ? (
            <SystemCore className="absolute inset-0 h-full w-full" />
          ) : (
            <StaticCore className="h-full w-full" />
          )}
        </motion.div>
      </div>

      {/* ---- Scroll cue ---- */}
      <ScrollCue reduce={!!reduce} />
    </section>
  );
}

// ---------------------------------------------------------------------------
// Scroll cue — mono label + animated 1px line (static when reduced-motion).
// ---------------------------------------------------------------------------

function ScrollCue({ reduce }: { reduce: boolean }) {
  return (
    <div className="pointer-events-none absolute bottom-7 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center gap-3">
      <span className="label-mono">Scroll</span>
      <div
        className="relative h-9 w-px overflow-hidden"
        style={{ background: "var(--hairline-strong)" }}
      >
        {!reduce && (
          <motion.span
            className="absolute left-0 top-0 block h-3 w-px"
            style={{ background: "var(--accent)" }}
            initial={{ y: -12 }}
            animate={{ y: 36 }}
            transition={{
              duration: 1.8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
}

export default HeroSection;
