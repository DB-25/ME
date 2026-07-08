"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { Project } from "@/data/projects";
import {
  gsap,
  createPinnedTimeline,
  prefersReducedMotion,
  isMobile,
} from "@/lib/animations/gsap-config";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

interface CaseStudyProps {
  project: Project;
  index: number;
  /** When true (and desktop + motion allowed) use the scrubbed pinned sequence. */
  pinned?: boolean;
}

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

const KIND_LABEL: Record<NonNullable<Project["kind"]>, string> = {
  ai: "AI systems",
  swe: "software",
  ml: "machine learning",
};

/** A single problem → approach → tradeoff narrative beat. */
function Beat({
  step,
  title,
  body,
  accent,
}: {
  step: string;
  title: string;
  body: string;
  accent: string;
}) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      <span
        className="label-mono pt-1"
        style={{ color: accent }}
      >
        {step}
      </span>
      <div>
        <h4 className="text-sm font-semibold uppercase tracking-wider text-[var(--text-primary)]">
          {title}
        </h4>
        <p className="mt-1.5 text-[15px] leading-relaxed text-[var(--text-secondary)]">
          {body}
        </p>
      </div>
    </div>
  );
}

export function CaseStudy({ project, index, pinned = false }: CaseStudyProps) {
  const accent = project.accentColor ?? "var(--accent)";
  const reversed = index % 2 === 1;
  const kindLabel = project.kind ? KIND_LABEL[project.kind] : "AI systems";

  const sectionRef = useRef<HTMLElement>(null);
  const inView = useInView(sectionRef, { once: true, amount: 0.2 });

  // Resolve whether the scrubbed/pinned sequence is allowed (desktop + motion).
  const [usePinned, setUsePinned] = useState(false);
  useEffect(() => {
    if (!pinned) {
      setUsePinned(false);
      return;
    }
    setUsePinned(!prefersReducedMotion() && !isMobile());
  }, [pinned]);

  // --- GENIE pinned, scrubbed "assemble itself" sequence ---
  const beatRefs = useRef<(HTMLDivElement | null)[]>([]);
  const diagramRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (!usePinned || !sectionRef.current) return;

    const ctx = gsap.context(() => {
      const beats = beatRefs.current.filter(Boolean) as HTMLDivElement[];

      gsap.set(headerRef.current, { opacity: 0, y: 28 });
      gsap.set(beats, { opacity: 0, y: 28 });
      if (diagramRef.current) {
        gsap.set(diagramRef.current, { opacity: 0, y: 36 });
        // each node assembles in
        gsap.set(diagramRef.current.querySelectorAll<SVGGElement>("svg > g:last-of-type > g"), {
          opacity: 0,
          scale: 0.85,
          transformOrigin: "center center",
        });
        gsap.set(diagramRef.current.querySelectorAll<SVGPathElement>("svg path"), {
          opacity: 0,
        });
      }

      const tl = createPinnedTimeline(sectionRef.current!, {
        scrollDistance: "230vh",
        scrub: 1,
      });

      tl.to(headerRef.current, { opacity: 1, y: 0, duration: 0.4 }, 0);

      // narrative beats reveal in sequence
      beats.forEach((b, i) => {
        tl.to(b, { opacity: 1, y: 0, duration: 0.4 }, 0.18 + i * 0.14);
      });

      // diagram container fades up
      tl.to(diagramRef.current, { opacity: 1, y: 0, duration: 0.5 }, 0.42);

      // nodes pop in one by one (left → right assemble)
      const nodeGroups = diagramRef.current?.querySelectorAll<SVGGElement>(
        "svg > g:last-of-type > g"
      );
      if (nodeGroups) {
        nodeGroups.forEach((g, i) => {
          tl.to(
            g,
            { opacity: 1, scale: 1, duration: 0.28 },
            0.5 + i * 0.06
          );
        });
      }
      // connectors draw in after nodes
      const paths = diagramRef.current?.querySelectorAll<SVGPathElement>("svg path");
      if (paths) {
        tl.to(paths, { opacity: 1, duration: 0.4, stagger: 0.04 }, 0.78);
      }
    }, sectionRef);

    return () => ctx.revert();
  }, [usePinned]);

  const reveal = (delay = 0) =>
    usePinned
      ? {}
      : {
          initial: { opacity: 0, y: 40 },
          animate: inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 },
          transition: { duration: 0.6, ease: EXPO_OUT, delay },
        };

  return (
    <section
      ref={sectionRef}
      id={`case-${project.id}`}
      className={cn(
        "section-full",
        usePinned && "min-h-screen flex items-center"
      )}
    >
      <div className="section w-full">
        <div
          className={cn(
            "grid items-start gap-x-14 gap-y-10 lg:grid-cols-2",
          )}
        >
          {/* --- Narrative column --- */}
          <div className={cn(reversed && "lg:order-2")}>
            <motion.div ref={headerRef} {...reveal(0)}>
              {/* eyebrow */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className="label-mono" style={{ color: accent }}>
                  {project.year ?? ""}
                </span>
                <span className="label-mono text-[var(--text-faint)]">·</span>
                <span className="label-mono">{kindLabel}</span>
                {project.award && (
                  <>
                    <span className="label-mono text-[var(--text-faint)]">·</span>
                    <span className="label-mono text-[var(--accent)]">
                      {project.award.includes("Cronin") ? "NASPO Cronin Gold" : "awarded"}
                    </span>
                  </>
                )}
              </div>

              {/* name + subtitle */}
              <h3 className="text-h2 mt-4 text-[var(--text-primary)]">
                {project.name}
              </h3>
              <p className="mt-2 text-lg text-[var(--text-secondary)]">
                {project.subtitle}
              </p>

              {/* metrics row */}
              <div className="mt-7 flex flex-wrap gap-x-10 gap-y-5">
                {project.metrics.map((m) => (
                  <div key={m.label}>
                    <div
                      className="num-display text-3xl sm:text-4xl"
                      style={{ color: accent }}
                    >
                      {m.value}
                    </div>
                    <div className="label-mono mt-2">{m.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* narrative beats */}
            <div className="mt-9 flex flex-col gap-6 border-l border-[var(--hairline)] pl-6">
              {[
                project.problem && { step: "01 · Problem", title: "The problem", body: project.problem },
                project.approach && { step: "02 · Approach", title: "The approach", body: project.approach },
                project.tradeoff && { step: "03 · Tradeoff", title: "The tradeoff", body: project.tradeoff },
              ]
                .filter(Boolean)
                .map((beat, i) => {
                  const b = beat as { step: string; title: string; body: string };
                  return (
                    <motion.div
                      key={b.step}
                      ref={(el) => {
                        beatRefs.current[i] = el;
                      }}
                      {...reveal(0.12 + i * 0.08)}
                    >
                      <Beat
                        step={b.step}
                        title={b.title}
                        body={b.body}
                        accent={accent}
                      />
                    </motion.div>
                  );
                })}
            </div>

            {/* links */}
            {project.links && project.links.length > 0 && (
              <motion.div
                {...reveal(0.4)}
                className="mt-8 flex flex-wrap gap-x-7 gap-y-2"
              >
                {project.links.map((link) => (
                  <a
                    key={link.url}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-grow inline-flex items-center gap-1 text-sm"
                  >
                    {link.label}
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </a>
                ))}
              </motion.div>
            )}
          </div>

          {/* --- Architecture column --- */}
          <div className={cn("lg:sticky lg:top-24", reversed && "lg:order-1")}>
            {project.architecture && (
              <motion.div ref={diagramRef} {...reveal(0.2)}>
                <ArchitectureDiagram
                  architecture={project.architecture}
                  accent={accent}
                  // when pinned, the timeline assembles + the static layout
                  // is enough; packets resume once not scrubbing isn't needed.
                  animate={!usePinned}
                />
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
