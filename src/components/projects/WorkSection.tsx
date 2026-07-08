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

  // Flutter ERP is the origin of the shipping story — pull it out and lead with it.
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
          <span className="label-mono">Selected work · 2019 — 2025</span>
          <h2 className="text-h1 mt-5 max-w-[20ch] text-[var(--text-primary)]">
            Systems I&apos;ve shipped to{" "}
            <span className="text-[var(--accent)]">production</span>.
          </h2>
          <p className="text-body mt-6">
            Not demos. Multi-tenant AI infrastructure that real people depend on
            every day — architected, shipped, and owned end-to-end.
          </p>
        </motion.div>
      </div>

      {/* --- Flagship case studies --- */}
      <div className="flex flex-col">
        {flagships.map((project, i) => (
          <CaseStudy
            key={project.id}
            project={project}
            index={i}
            pinned={project.id === "genie"}
          />
        ))}
      </div>

      {/* --- Secondary: editorial bento grid --- */}
      <div className="section pt-0">
        <div className="mb-12 border-t border-[var(--hairline)] pt-12">
          <span className="label-mono">Foundations</span>
          <h3 className="text-h3 mt-3 max-w-[34ch] text-[var(--text-primary)]">
            The infrastructure the flagships are built on — and where the
            shipping habit began.
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-6">
          {/* Origin story — Flutter ERP, given a wider, distinct slot */}
          {origin && (
            <div className="relative md:col-span-6 lg:col-span-3">
              <span className="label-mono absolute -top-px right-5 z-10 hidden -translate-y-1/2 bg-[var(--bg-primary)] px-2 text-[var(--accent)] md:inline">
                where it started
              </span>
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
