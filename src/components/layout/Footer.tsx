"use client";

import { useRef, type MouseEvent as ReactMouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Mail, ArrowDown } from "lucide-react";
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
    x.set((e.clientX - centerX) * 0.25);
    y.set((e.clientY - centerY) * 0.25);
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
        "hover:text-[var(--accent-warm)] hover:border-[var(--accent-warm)]/30",
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
      <div className="max-w-xl">
        {/* Heading — casual */}
        <h2 className="text-h2 text-[var(--text-primary)] mb-4">
          Say hi
        </h2>

        {/* Personal one-liner */}
        <p className="text-body text-[var(--text-secondary)] mb-10">
          Based in Boston. From Bangalore. Fueled by pani puri.
        </p>

        {/* Icon links */}
        <div className="flex items-center gap-5 mb-8">
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
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
          </MagneticIcon>

          <MagneticIcon
            href={profile.github}
            label="GitHub"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
          </MagneticIcon>
        </div>

        {/* Resume download */}
        <a
          href="/resume.pdf"
          download
          className={cn(
            "group inline-flex items-center gap-2 px-6 py-3 rounded-full",
            "text-sm font-medium text-[var(--accent-warm)]",
            "bg-[var(--accent-warm)]/10 border border-[var(--accent-warm)]/20",
            "hover:bg-[var(--accent-warm)]/20 hover:border-[var(--accent-warm)]/40",
            "transition-all duration-200"
          )}
        >
          Download Resume
          <ArrowDown className="w-4 h-4 transition-transform duration-200 group-hover:translate-y-0.5" />
        </a>

        {/* Off-duty aside */}
        <p className="text-xs text-[var(--text-tertiary)] mt-12">
          Off-duty: Valorant, cooking experiments, PC builds
        </p>
      </div>
    </footer>
  );
}
