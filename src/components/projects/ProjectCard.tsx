"use client";

import type { Project } from "@/data/projects";
import { cn } from "@/lib/utils";
import { ExternalLink } from "lucide-react";
import { RevealText } from "@/components/ui/RevealText";

interface ProjectCardProps {
  project: Project;
  index: number;
}

export function ProjectCard({ project, index }: ProjectCardProps) {
  return (
    <RevealText direction="up" delay={index * 0.1}>
      <div
        className={cn(
          "glass-sm rounded-2xl p-6 h-full flex flex-col",
          "transition-all duration-200 ease-out",
          "hover:-translate-y-2 hover:border-[var(--accent)]/20",
          "hover:shadow-[0_8px_30px_rgba(124,58,237,0.08)]"
        )}
      >
        {/* Project name */}
        <h4 className="text-h3 text-[var(--text-primary)] mb-1">
          {project.name}
        </h4>

        {/* Subtitle */}
        <p className="text-sm text-[var(--text-secondary)] mb-3">
          {project.subtitle}
        </p>

        {/* Description — truncated */}
        <p className="text-sm text-[var(--text-tertiary)] leading-relaxed mb-5 line-clamp-3 flex-1">
          {project.description}
        </p>

        {/* Metrics row */}
        {project.metrics.length > 0 && (
          <div className="flex flex-wrap gap-4 mb-4">
            {project.metrics.map((metric) => (
              <div key={metric.label} className="flex flex-col">
                <span className="text-sm font-semibold text-[var(--text-primary)]">
                  {metric.value}
                </span>
                <span className="text-xs text-[var(--text-tertiary)]">
                  {metric.label}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Tech stack badges */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className={cn(
                "text-[11px] px-2 py-0.5 rounded-full",
                "bg-[var(--bg-surface)] border border-[var(--bg-border)]",
                "text-[var(--text-tertiary)]"
              )}
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Links */}
        {project.links && project.links.length > 0 && (
          <div className="flex gap-2 mt-auto pt-2">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium",
                  "text-[var(--accent-light)] hover:text-[var(--accent-lighter)]",
                  "transition-colors duration-200"
                )}
              >
                {link.label}
                <ExternalLink className="w-3 h-3" />
              </a>
            ))}
          </div>
        )}
      </div>
    </RevealText>
  );
}
