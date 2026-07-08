"use client";

import { useRef } from "react";
import { motion, useInView } from "framer-motion";
import { projects } from "@/data/projects";
import { CaseStudy } from "./CaseStudy";
import { ProjectCard } from "./ProjectCard";

const EXPO_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function WorkSection() {
  const headingRef = useRef<HTMLDivElement>(null);
  const headingInView = useInView(headingRef, { once: true, amount: 0.4 });

  const flagships = projects.filter((p) => p.flagship);
  const secondary = projects.filter((p) => !p.flagship);

  // Flutter ERP is the origin of the whole arc — pull it out and lead with it.
  const origin = secondary.find((p) => p.id === "flutter-erp");
  const rest = secondary.filter((p) => p.id !== "flutter-erp");

  return (
    <section id="work" className="relative">
      {/* --- Section header --- */}
      <div className="section pb-0">
        <motion.div
          ref={headingRef}
          initial={{ opacity: 0, y: 40 }}
          animate={headingInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ duration: 0.7, ease: EXPO_OUT }}
        >
          <span className="label-mono">
            four case studies · one origin story
          </span>
          <h2 className="text-h1 mt-5 max-w-[20ch] text-[var(--text-primary)]">
            The work, <span className="text-[var(--accent)]">up close</span>.
          </h2>
          <p className="text-body mt-6">
            Each flagship gets the problem, the approach, and the tradeoff I
            accepted — plus the architecture and links that don&apos;t come
            from me.
          </p>
        </motion.div>
      </div>

      {/* --- Flagship case studies — all use the same in-view reveal --- */}
      <div className="flex flex-col">
        {flagships.map((project, i) => (
          <CaseStudy key={project.id} project={project} index={i} />
        ))}
      </div>

      {/* --- Secondary: editorial bento grid --- */}
      <div className="section pt-0">
        <div className="mb-12 border-t border-[var(--hairline)] pt-12">
          <span className="label-mono">foundations</span>
          <h3 className="text-h3 mt-3 max-w-[34ch] text-[var(--text-primary)]">
            What the flagships are built on — reused, not rebuilt, for every
            new tool.
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
          {/* Origin story — Flutter ERP, given a wider, distinct slot */}
          {origin && (
            <div className="md:col-span-6 lg:col-span-3">
              <ProjectCard project={origin} />
            </div>
          )}

          {/* the AI-infra cards — even 3-col slots fill out the bento */}
          {rest.map((project) => (
            <div key={project.id} className="md:col-span-3">
              <ProjectCard project={project} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
