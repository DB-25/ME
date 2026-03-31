"use client";

import { useRef, useEffect, useState } from "react";
import type { Project } from "@/data/projects";
import { cn } from "@/lib/utils";
import { AnimatedCounter } from "@/components/ui/AnimatedCounter";
import { ExternalLink, Trophy } from "lucide-react";
import {
  gsap,
  ScrollTrigger,
  createPinnedTimeline,
  prefersReducedMotion,
  isMobile,
} from "@/lib/animations/gsap-config";

interface ProjectHeroProps {
  project: Project;
}

/**
 * Parse metric value strings like "10+", "500K+", "44K+", "83%", "$8K + $8K AWS"
 * into parts for AnimatedCounter. Returns null numericValue when not parsable.
 */
function parseMetricValue(raw: string): {
  numericValue: number | null;
  prefix: string;
  suffix: string;
} {
  const match = raw.match(/^(\$?)([\d,]+(?:\.\d+)?)(.*)/);
  if (!match) return { numericValue: null, prefix: "", suffix: raw };

  const prefix = match[1];
  const numStr = match[2].replace(/,/g, "");
  const numericValue = parseFloat(numStr);
  const suffix = match[3];

  if (suffix.startsWith("K")) {
    return {
      numericValue: numericValue * 1000,
      prefix,
      suffix: suffix.replace(/^K/, "K"),
    };
  }

  return { numericValue, prefix, suffix };
}

export function ProjectHero({ project }: ProjectHeroProps) {
  const accentColor = project.accentColor ?? "var(--accent)";
  const accentLight = project.accentColor
    ? `${project.accentColor}CC`
    : "var(--accent-light)";

  // Refs for the pin container and each animatable group
  const containerRef = useRef<HTMLDivElement>(null);
  const bgGlowRef = useRef<HTMLDivElement>(null);
  const awardRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const metricsRef = useRef<HTMLDivElement>(null);
  const techRef = useRef<HTMLDivElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  // Track whether metrics should start counting
  const [metricsActive, setMetricsActive] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reduced motion or mobile: simple fade-in reveal, no pin
    if (prefersReducedMotion() || isMobile()) {
      // Immediately show everything with a simple fade
      const targets = [
        bgGlowRef.current,
        awardRef.current,
        titleRef.current,
        subtitleRef.current,
        descriptionRef.current,
        metricsRef.current,
        techRef.current,
        linksRef.current,
      ].filter(Boolean) as HTMLElement[];

      const ctx = gsap.context(() => {
        // Use a ScrollTrigger without pin for simple reveal
        gsap.fromTo(
          targets,
          { opacity: 0, y: 30 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            stagger: 0.08,
            ease: "expo.out",
            scrollTrigger: {
              trigger: container,
              start: "top 80%",
              once: true,
            },
            onComplete: () => setMetricsActive(true),
          }
        );
      }, container);

      return () => ctx.revert();
    }

    // --- Desktop GSAP ScrollTrigger pin + scrub ---
    const ctx = gsap.context(() => {
      // Set initial hidden states
      const allTargets = [
        bgGlowRef.current,
        awardRef.current,
        titleRef.current,
        subtitleRef.current,
        descriptionRef.current,
        metricsRef.current,
        techRef.current,
        linksRef.current,
      ].filter(Boolean) as HTMLElement[];

      gsap.set(allTargets, { opacity: 0 });

      if (bgGlowRef.current) {
        gsap.set(bgGlowRef.current, { opacity: 0 });
      }

      const textTargets = [
        awardRef.current,
        titleRef.current,
        subtitleRef.current,
        descriptionRef.current,
      ].filter(Boolean) as HTMLElement[];
      gsap.set(textTargets, { y: 60 });

      if (metricsRef.current) gsap.set(metricsRef.current, { y: 40 });
      if (techRef.current) gsap.set(techRef.current, { y: 30 });
      if (linksRef.current) gsap.set(linksRef.current, { y: 30 });

      // Create the pinned timeline
      const tl = createPinnedTimeline(container);

      // 0-20%: Background glow fades in
      if (bgGlowRef.current) {
        tl.to(
          bgGlowRef.current,
          { opacity: 0.07, duration: 0.2, ease: "none" },
          0
        );
      }

      // 20-40%: Title + subtitle reveal
      if (awardRef.current) {
        tl.to(
          awardRef.current,
          { opacity: 1, y: 0, duration: 0.15, ease: "expo.out" },
          0.15
        );
      }
      if (titleRef.current) {
        tl.to(
          titleRef.current,
          { opacity: 1, y: 0, duration: 0.2, ease: "expo.out" },
          0.2
        );
      }
      if (subtitleRef.current) {
        tl.to(
          subtitleRef.current,
          { opacity: 1, y: 0, duration: 0.15, ease: "expo.out" },
          0.25
        );
      }
      if (descriptionRef.current) {
        tl.to(
          descriptionRef.current,
          { opacity: 1, y: 0, duration: 0.15, ease: "expo.out" },
          0.3
        );
      }

      // 40-60%: Metrics animate in (staggered by using small offsets)
      if (metricsRef.current) {
        tl.to(
          metricsRef.current,
          {
            opacity: 1,
            y: 0,
            duration: 0.2,
            ease: "expo.out",
            onStart: () => setMetricsActive(true),
          },
          0.4
        );
      }

      // 60-80%: Tech stack and links reveal
      if (techRef.current) {
        tl.to(
          techRef.current,
          { opacity: 1, y: 0, duration: 0.15, ease: "expo.out" },
          0.6
        );
      }
      if (linksRef.current) {
        tl.to(
          linksRef.current,
          { opacity: 1, y: 0, duration: 0.15, ease: "expo.out" },
          0.65
        );
      }

      // 80-100%: Hold — everything stays visible, then unpin happens naturally
    }, container);

    return () => ctx.revert();
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative w-full min-h-screen flex items-center overflow-hidden"
    >
      {/* Background glow */}
      <div
        ref={bgGlowRef}
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse 80% 50% at 50% 50%, ${accentColor}, transparent)`,
        }}
      />

      <div className="section relative z-10 py-16 md:py-24 w-full">
        {/* Award badge */}
        {project.award && (
          <div ref={awardRef} className="flex items-center gap-2 mb-6">
            <Trophy className="w-4 h-4 text-[#F59E0B]" />
            <span
              className="text-caption px-3 py-1 rounded-full"
              style={{
                color: "#F59E0B",
                backgroundColor: "rgba(245, 158, 11, 0.1)",
                border: "1px solid rgba(245, 158, 11, 0.2)",
              }}
            >
              {project.award}
            </span>
          </div>
        )}

        {/* Project name */}
        <h3
          ref={titleRef}
          className="text-h1 mb-2"
          style={{ color: accentLight }}
        >
          {project.name}
        </h3>

        {/* Subtitle */}
        <p
          ref={subtitleRef}
          className="text-[var(--text-secondary)] text-lg mb-6"
        >
          {project.subtitle}
        </p>

        {/* Description */}
        <p
          ref={descriptionRef}
          className="text-body text-[var(--text-secondary)] mb-10 max-w-3xl"
        >
          {project.description}
        </p>

        {/* Metrics */}
        <div ref={metricsRef} className="flex flex-wrap gap-8 mb-8">
          {project.metrics.map((metric) => {
            const parsed = parseMetricValue(metric.value);
            return (
              <div key={metric.label} className="flex flex-col">
                <span className="text-h2 font-bold text-[var(--text-primary)]">
                  {parsed.numericValue !== null && metricsActive ? (
                    <AnimatedCounter
                      value={parsed.numericValue}
                      prefix={parsed.prefix}
                      suffix={parsed.suffix}
                      duration={1500}
                    />
                  ) : parsed.numericValue !== null ? (
                    <span style={{ fontVariantNumeric: "tabular-nums" }}>
                      {parsed.prefix}0{parsed.suffix}
                    </span>
                  ) : (
                    metric.value
                  )}
                </span>
                <span className="text-sm text-[var(--text-tertiary)] mt-1">
                  {metric.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Tech stack badges */}
        <div ref={techRef} className="flex flex-wrap gap-2 mb-6">
          {project.techStack.map((tech) => (
            <span
              key={tech}
              className={cn(
                "text-xs px-3 py-1 rounded-full",
                "bg-[var(--bg-surface)] border border-[var(--bg-border)]",
                "text-[var(--text-secondary)]"
              )}
            >
              {tech}
            </span>
          ))}
        </div>

        {/* Links */}
        {project.links && project.links.length > 0 && (
          <div ref={linksRef} className="flex gap-3">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "inline-flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium",
                  "transition-all duration-200",
                  "hover:brightness-110"
                )}
                style={{
                  backgroundColor: `${accentColor}20`,
                  color: accentLight,
                  border: `1px solid ${accentColor}40`,
                }}
              >
                {link.label}
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
