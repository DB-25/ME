"use client";

import { projects } from "@/data/projects";
import { RevealText } from "@/components/ui/RevealText";
import { ProjectHero } from "./ProjectHero";
import { ProjectCard } from "./ProjectCard";

export function ProjectsSection() {
  const flagships = projects.filter((p) => p.flagship);
  const secondary = projects.filter((p) => !p.flagship);

  return (
    <section id="projects" className="py-24 md:py-32">
      {/* Section heading */}
      <div className="section">
        <RevealText direction="up">
          <div className="text-center mb-16 md:mb-24">
            <p className="text-caption mb-3 text-[var(--accent-light)]">
              PROJECTS
            </p>
            <h2 className="text-h1 text-[var(--text-primary)]">
              What I&apos;ve Built
            </h2>
          </div>
        </RevealText>
      </div>

      {/* Flagship projects -- stacked, each pins independently via GSAP */}
      <div className="flex flex-col">
        {flagships.map((project) => (
          <ProjectHero key={project.id} project={project} />
        ))}
      </div>

      {/* Secondary projects -- responsive grid */}
      {secondary.length > 0 && (
        <div className="section mt-16">
          <RevealText direction="up">
            <h3 className="text-h2 text-[var(--text-primary)] mb-10">
              More Projects
            </h3>
          </RevealText>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {secondary.map((project, idx) => (
              <ProjectCard key={project.id} project={project} index={idx} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
