"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { Project } from "@/data/projects";
import { receiptsForProject } from "@/data/receipts";
import { prefersReducedMotion } from "@/lib/animations/gsap-config";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

interface CaseStudyProps {
  project: Project;
  index: number;
}

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/* ------------------------------------------------------------------ */
/* Per-flagship personality — each case study gets its own eyebrow     */
/* and subtitle so the four don't read as one template stamped 4×.     */
/* ------------------------------------------------------------------ */

const EYEBROW: Record<string, string> = {
  genie: "the statewide one",
  "a-iep": "the personal one",
  "vct-scout": "the fun one · 48 hours",
  "one-l-abe": "the decorated one",
};

// Local subtitles: the data subtitles repeat the headline metric that
// already sits in the tiles directly below ("44K+", "2nd / 3,300+"…).
const SUBTITLE: Record<string, string> = {
  genie: "A secure multi-model AI sandbox for Massachusetts state government.",
  "a-iep":
    "Turns dense special-education paperwork into answers families can use.",
  "vct-scout":
    "An esports scouting copilot that answers questions a coach would actually ask.",
  "one-l-abe": "Reads state contracts for conflicts and drafts the redlines.",
};

// One-line "how" behind each metric — a number without a mechanism reads fake.
const METRIC_HOW: Record<string, string> = {
  "genie:State Employees": "rolled out across 8+ Massachusetts departments",
  "genie:Cost Reduction":
    "the router sends each query to the cheapest capable model",
  "genie:Models Routed": "Claude, Titan, Mistral and more, via Bedrock",
  "a-iep:Families Served": "live today at a-iep.org",
  "a-iep:Languages": "translation is a pipeline stage, not an afterthought",
  "a-iep:Pipeline Stages": "OCR → PII redaction → analysis → translation",
  "vct-scout:Placement": "AWS × Riot Games, judged at re:Invent 2024",
  "vct-scout:Prize": "$8K cash + $8K in AWS credits",
  "vct-scout:Game Logs": "4,700+ match files, queried through Athena",
  "one-l-abe:Legal Review Cut":
    "measured on real contracts — lawyers still sign off",
  "one-l-abe:Pipeline Stages":
    "conflict detection through redlining, on Step Functions",
  "one-l-abe:CloudWatch Alarms": "quality is monitored, not assumed",
};

// Beat rail labels. One mono label per beat — the body carries the content.
const BEAT_STEPS_DEFAULT = ["01 — problem", "02 — approach", "03 — tradeoff"];
const BEAT_STEPS_VCT = ["01 — the brief", "02 — the build", "03 — the bet"];

/* ------------------------------------------------------------------ */
/* Receipt chip — the shared trust unit. Hairline mono chip: outlet    */
/* name + external arrow; hover reveals what the source verifies.      */
/* Also imported by ImpactSection for the aggregate source strip.      */
/* ------------------------------------------------------------------ */

export interface ReceiptChipData {
  outlet: string;
  url: string;
  verifies?: string;
}

export function ReceiptChip({ chip }: { chip: ReceiptChipData }) {
  return (
    <a
      href={chip.url}
      target="_blank"
      rel="noopener noreferrer"
      title={chip.verifies ?? chip.outlet}
      className="group/chip relative inline-flex items-center gap-1.5 rounded-md border border-[var(--hairline)] px-3 py-1.5 font-mono text-[0.72rem] text-[var(--text-secondary)] transition-colors duration-200 hover:border-[var(--hairline-strong)] hover:bg-[var(--bg-surface)] hover:text-[var(--text-primary)]"
    >
      {chip.outlet}
      <ArrowUpRight className="h-3 w-3 shrink-0 text-[var(--text-tertiary)] transition-colors duration-200 group-hover/chip:text-[var(--accent)]" />
      {chip.verifies && (
        <span
          role="tooltip"
          className="pointer-events-none absolute bottom-full left-0 z-20 mb-2 hidden w-max max-w-[38ch] rounded-md border border-[var(--hairline-strong)] bg-[var(--bg-elevated)] px-3 py-2 font-sans text-[0.72rem] normal-case leading-snug tracking-normal text-[var(--text-secondary)] opacity-0 transition-opacity duration-200 group-hover/chip:opacity-100 md:block"
        >
          {chip.verifies}
        </span>
      )}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Screenshot frame — hairline browser chrome (three-dot motif),       */
/* 16:10. Screenshots may not exist yet; onError swaps to a quiet      */
/* placeholder instead of a broken image.                              */
/* ------------------------------------------------------------------ */

function ScreenshotFrame({
  src,
  name,
  accent,
  video,
  videoAutoplay,
}: {
  src: string;
  name: string;
  accent: string;
  /** Demo video — local "/videos/x.mp4" renders a native <video>; an external
   *  player URL renders an iframe. Takes precedence over the screenshot. */
  video?: string;
  /** Silent screen-recordings loop muted; narrated videos show controls. */
  videoAutoplay?: boolean;
}) {
  const [missing, setMissing] = useState(false);
  const isLocalVideo = !!video && video.startsWith("/");

  return (
    <figure className="overflow-hidden rounded-[10px] border border-[var(--hairline)] bg-[var(--bg-surface)]">
      <div
        className="flex items-center gap-1.5 border-b border-[var(--hairline)] px-4 py-2.5"
        aria-hidden
      >
        <span className="h-2 w-2 rounded-full bg-[var(--bg-border)]" />
        <span className="h-2 w-2 rounded-full bg-[var(--bg-border)]" />
        <span
          className="h-2 w-2 rounded-full opacity-70"
          style={{ background: accent }}
        />
        <span className="ml-2 font-mono text-[0.65rem] tracking-wide text-[var(--text-faint)]">
          {video ? `${name.toLowerCase()} — live demo` : name.toLowerCase()}
        </span>
      </div>
      <div className={video ? "relative aspect-video" : "relative aspect-[16/10]"}>
        {isLocalVideo ? (
          // Native video. Silent screen-recordings autoplay muted in a loop —
          // a living screenshot; narrated videos wait for the user (controls).
          // eslint-disable-next-line jsx-a11y/media-has-caption
          <video
            src={video}
            className="absolute inset-0 h-full w-full object-contain bg-[#0A0A0C]"
            playsInline
            controls={!videoAutoplay}
            muted={videoAutoplay}
            autoPlay={videoAutoplay}
            loop={videoAutoplay}
            preload={videoAutoplay ? "auto" : "metadata"}
            poster={src || undefined}
            aria-label={`${name} — demo video`}
          />
        ) : video ? (
          <iframe
            src={video}
            title={`${name} — demo video`}
            className="absolute inset-0 h-full w-full"
            style={{ border: 0 }}
            loading="lazy"
            allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        ) : missing ? (
          <div className="flex h-full w-full items-center justify-center">
            <span className="label-mono">screenshot coming soon</span>
          </div>
        ) : (
          // Plain <img> on purpose — next/image hard-errors on missing files,
          // and these screenshots land incrementally.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={src}
            alt={`${name} — product screenshot`}
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-top"
            onError={() => setMissing(true)}
          />
        )}
      </div>
    </figure>
  );
}

/** A single narrative beat: one numbered mono label, body carries the rest. */
function Beat({
  step,
  body,
  accent,
}: {
  step: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4">
      <span className="label-mono pt-[3px]" style={{ color: accent }}>
        {step}
      </span>
      <p className="text-[15px] leading-relaxed text-[var(--text-secondary)]">
        {body}
      </p>
    </div>
  );
}

export function CaseStudy({ project, index }: CaseStudyProps) {
  const accent = project.accentColor ?? "var(--accent)";
  const reversed = index % 2 === 1;

  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });

  // Reduced motion: render everything static, no y-offsets.
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    setReduced(prefersReducedMotion());
  }, []);

  const reveal = (delay = 0) =>
    reduced
      ? {}
      : {
          initial: { opacity: 0, y: 40 },
          animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
          transition: { duration: 0.6, ease: EXPO_OUT, delay },
        };

  const steps =
    project.id === "vct-scout" ? BEAT_STEPS_VCT : BEAT_STEPS_DEFAULT;
  const beats = [
    project.problem && { step: steps[0], body: project.problem },
    project.approach && { step: steps[1], body: project.approach },
    project.tradeoff && { step: steps[2], body: project.tradeoff },
  ].filter(Boolean) as { step: string; body: string }[];

  // Receipts first; fall back to the project's own links when no third-party
  // source exists yet.
  const projectReceipts = receiptsForProject(project.id);
  const chips: ReceiptChipData[] =
    projectReceipts.length > 0
      ? projectReceipts
      : (project.links ?? []).map((l) => ({ outlet: l.label, url: l.url }));

  return (
    <section
      ref={sectionRef}
      id={`case-${project.id}`}
      className="section-full"
    >
      <div className="section w-full">
        <div className="grid items-start gap-x-14 gap-y-10 lg:grid-cols-2">
          {/* --- Narrative column --- */}
          <div className={cn(reversed && "lg:order-2")}>
            <motion.div {...reveal(0)}>
              {/* eyebrow */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="label-mono" style={{ color: accent }}>
                  {EYEBROW[project.id] ?? "case study"}
                </span>
                {project.year && (
                  <>
                    <span className="label-mono text-[var(--text-faint)]">
                      ·
                    </span>
                    <span className="label-mono">{project.year}</span>
                  </>
                )}
                {project.award && (
                  <>
                    <span className="label-mono text-[var(--text-faint)]">
                      ·
                    </span>
                    <span className="label-mono text-[var(--accent)]">
                      NASPO Cronin Gold
                    </span>
                  </>
                )}
              </div>

              {/* name + subtitle */}
              <h3 className="text-h2 mt-4 text-[var(--text-primary)]">
                {project.name}
              </h3>
              <p className="mt-2 text-lg text-[var(--text-secondary)]">
                {SUBTITLE[project.id] ?? project.subtitle}
              </p>

              {/* outcome metrics — this flagship owns these numbers.
                  Value + legible label + the one-line "how". */}
              <div className="mt-7 flex flex-wrap gap-x-10 gap-y-6">
                {project.metrics.map((m) => {
                  const how = METRIC_HOW[`${project.id}:${m.label}`];
                  return (
                    <div key={m.label} className="max-w-[24ch]">
                      <div
                        className="num-display text-3xl sm:text-4xl"
                        style={{ color: accent }}
                      >
                        {m.value}
                      </div>
                      <div className="mt-2 text-sm font-medium text-[var(--text-primary)]">
                        {m.label}
                      </div>
                      {how && (
                        <p className="mt-1 text-[0.8rem] leading-snug text-[var(--text-tertiary)]">
                          {how}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>

            {/* narrative beats */}
            <div className="mt-9 flex flex-col gap-6 border-l border-[var(--hairline)] pl-6">
              {beats.map((b, i) => (
                <motion.div key={b.step} {...reveal(0.12 + i * 0.08)}>
                  <Beat step={b.step} body={b.body} accent={accent} />
                </motion.div>
              ))}
            </div>

            {/* receipts — third-party sources, or plain links as fallback */}
            {chips.length > 0 && (
              <motion.div {...reveal(0.4)} className="mt-9">
                <p className="label-mono mb-3">
                  {projectReceipts.length > 0 ? "receipts" : "links"}
                </p>
                <div className="flex flex-wrap gap-2">
                  {chips.map((c) => (
                    <ReceiptChip key={c.url} chip={c} />
                  ))}
                </div>
              </motion.div>
            )}
          </div>

          {/* --- Evidence column: screenshot + architecture --- */}
          <div
            className={cn(
              "flex flex-col gap-6 lg:sticky lg:top-24",
              reversed && "lg:order-1"
            )}
          >
            {(project.screenshot || project.video) && (
              <motion.div {...reveal(0.15)}>
                <ScreenshotFrame
                  src={project.screenshot ?? ""}
                  name={project.name}
                  accent={accent}
                  video={project.video}
                  videoAutoplay={project.videoAutoplay}
                />
              </motion.div>
            )}
            {project.architecture && (
              <motion.div {...reveal(0.25)}>
                <ArchitectureDiagram
                  architecture={project.architecture}
                  accent={accent}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
