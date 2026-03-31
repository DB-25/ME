"use client";

import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Mail, ExternalLink, ArrowDown } from "lucide-react";
import { profile } from "@/data/profile";
import { cn } from "@/lib/utils";

interface MagneticIconProps {
  children: React.ReactNode;
  href: string;
  label: string;
  download?: boolean;
}

function MagneticIcon({ children, href, label, download }: MagneticIconProps) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 300, damping: 20 });
  const springY = useSpring(y, { stiffness: 300, damping: 20 });

  function handleMouseMove(e: ReactMouseEvent<HTMLAnchorElement>) {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const deltaX = (e.clientX - centerX) * 0.25;
    const deltaY = (e.clientY - centerY) * 0.25;
    x.set(deltaX);
    y.set(deltaY);
  }

  function handleMouseLeave() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.a
      ref={ref}
      href={href}
      target={download ? undefined : "_blank"}
      rel={download ? undefined : "noopener noreferrer"}
      download={download || undefined}
      aria-label={label}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={cn(
        "inline-flex items-center justify-center w-14 h-14 rounded-full",
        "glass-sm text-[var(--text-secondary)]",
        "hover:text-[var(--accent-light)] hover:border-[var(--accent)]/30",
        "transition-colors duration-200"
      )}
    >
      {children}
    </motion.a>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="section py-24 md:py-32">
      <div className="text-center">
        {/* CTA heading */}
        <h2 className="text-h1 text-[var(--text-primary)] mb-12 max-w-2xl mx-auto">
          Let&apos;s build something that matters.
        </h2>

        {/* Icon links */}
        <div className="flex items-center justify-center gap-5 mb-10">
          <MagneticIcon
            href={`mailto:${profile.email}`}
            label="Email"
          >
            <Mail className="w-5 h-5" />
          </MagneticIcon>

          <MagneticIcon
            href={profile.linkedin}
            label="LinkedIn"
          >
            <ExternalLink className="w-5 h-5" />
          </MagneticIcon>

          <MagneticIcon
            href={profile.github}
            label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </MagneticIcon>
        </div>

        {/* Resume download button */}
        <a
          href="/resume.pdf"
          download
          className={cn(
            "group inline-flex items-center gap-2 px-6 py-3 rounded-full",
            "text-sm font-medium text-[var(--accent-light)]",
            "bg-[var(--accent)]/10 border border-[var(--accent)]/20",
            "hover:bg-[var(--accent)]/20 hover:border-[var(--accent)]/40",
            "transition-all duration-200"
          )}
        >
          Download Resume
          <ArrowDown className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
        </a>

        {/* Credit line */}
        <p className="text-xs text-[var(--text-tertiary)] mt-16">
          Designed & built by {profile.name}
        </p>
      </div>
    </footer>
  );
}
