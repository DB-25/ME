"use client";

import type { Project } from "@/data/projects";
import { cn } from "@/lib/utils";
import { ArrowUpRight } from "lucide-react";

interface ProjectCardProps {
  project: Project;
}

/**
 * Editorial secondary-project tile. Hairline `.tile`, mono labels,
 * `.num-display` metric, `.link-grow` links, tech as understated mono
 * tags separated by middots — deliberately NOT MUI pills.
 */
export function ProjectCard({ project }: ProjectCardProps) {
  const accent = project.accentColor ?? "var(--accent)";
  const kindLabel =
    project.kind === "swe"
      ? "software"
      : project.kind === "ml"
        ? "machine learning"
        : "ai systems";
  const lead = project.metrics[0];

  return (
    <article
      className={cn(
        "tile group flex h-full flex-col p-6 sm:p-7",
      )}
    >
      {/* eyebrow */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <span className="label-mono">{kindLabel}</span>
        <span
          className="inline-block h-[6px] w-[6px] rounded-full opacity-70 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: accent }}
        />
      </div>

      {/* name + subtitle */}
      <h4 className="text-h3 text-[var(--text-primary)]">{project.name}</h4>
      <p className="mt-1.5 text-sm text-[var(--text-secondary)]">
        {project.subtitle}
      </p>

      {/* description */}
      <p className="mt-4 text-sm leading-relaxed text-[var(--text-tertiary)]">
        {project.description}
      </p>

      {/* lead metric — understated, big number */}
      {lead && (
        <div className="mt-6 flex items-baseline gap-3">
          <span
            className="num-display text-2xl"
            style={{ color: accent }}
          >
            {lead.value}
          </span>
          <span className="label-mono">{lead.label}</span>
        </div>
      )}

      {/* spacer pushes meta to the bottom for a clean grid baseline */}
      <div className="flex-1" />

      {/* tech — mono, middot-separated, NOT pills */}
      <p className="mt-6 font-mono text-[11px] leading-relaxed tracking-wide text-[var(--text-tertiary)]">
        {project.techStack.join("  ·  ")}
      </p>

      {/* links */}
      {project.links && project.links.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-x-6 gap-y-2 border-t border-[var(--hairline)] pt-4">
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
        </div>
      )}
    </article>
  );
}
