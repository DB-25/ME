"use client";

import { useRef, useState, type MouseEvent as ReactMouseEvent } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Mail } from "lucide-react";
import { profile } from "@/data/profile";
import { RevealText } from "@/components/ui/RevealText";
import { cn } from "@/lib/utils";

/** Prefers the real photo at /photos/dhruv.jpg; falls back to the memoji
 *  until that file is dropped into /public/photos/. Plain <img> on purpose —
 *  next/image has no graceful path for a file that may not exist yet. */
function ProfilePhoto() {
  const [src, setSrc] = useState("/photos/dhruv.jpg");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={profile.name}
      className="h-full w-full object-cover"
      onError={() => setSrc((s) => (s === "/memoji.png" ? s : "/memoji.png"))}
    />
  );
}

interface MagneticIconProps {
  children: React.ReactNode;
  href: string;
  label: string;
  download?: boolean;
}

/** Magnetic social link — pointer-following spring, reused from the prior footer. */
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
        "inline-flex h-12 w-12 items-center justify-center rounded-full",
        "tile text-[var(--text-secondary)]",
        "hover:!border-[var(--accent)]/40 hover:text-[var(--accent)]",
        "transition-colors duration-200"
      )}
    >
      {children}
    </motion.a>
  );
}

export function Footer() {
  return (
    <footer id="contact" className="section py-28 md:py-40">
      <div className="flex flex-col gap-12 md:flex-row md:items-end md:justify-between">
        {/* The warm moment */}
        <div className="max-w-2xl">
          <RevealText direction="up">
            <p className="label-mono mb-5">say hi · let&apos;s build something</p>
          </RevealText>
          <RevealText direction="up" delay={0.05}>
            <h2 className="text-h1 text-[var(--text-primary)]">
              Got a system that real
              <br className="hidden sm:block" /> people will depend on?{" "}
              <span style={{ color: "var(--accent)" }}>Let&apos;s talk.</span>
            </h2>
          </RevealText>
          <RevealText direction="up" delay={0.1}>
            <p className="text-body mt-6">
              I&apos;m happiest shipping things that matter — and always up for a
              good problem, a strong coffee, or an argument about the best
              vector store. Based in {profile.location}, by way of{" "}
              {profile.origin}.
            </p>
          </RevealText>
        </div>

        {/* Real photo (drop /public/photos/dhruv.jpg) — memoji until it exists */}
        <RevealText direction="up" delay={0.15}>
          <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full tile md:h-32 md:w-32">
            <ProfilePhoto />
          </div>
        </RevealText>
      </div>

      {/* Social links — magnetic */}
      <RevealText direction="up" delay={0.1}>
        <div className="mt-14 flex items-center gap-4">
          <MagneticIcon href={`mailto:${profile.email}`} label="Email">
            <Mail className="h-5 w-5" />
          </MagneticIcon>

          <MagneticIcon href={profile.linkedin} label="LinkedIn">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </MagneticIcon>

          <MagneticIcon href={profile.github} label="GitHub">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
          </MagneticIcon>

          <span className="ml-3 hidden font-mono text-[0.78rem] text-[var(--text-secondary)] sm:inline">
            {profile.email}
          </span>
        </div>
      </RevealText>

      {/* Bottom bar — resume + off-duty personality */}
      <div className="mt-20 flex flex-col gap-6 hairline-t pt-8 md:flex-row md:items-center md:justify-between">
        <a
          href="/resume.pdf"
          download
          className="link-grow font-mono text-[0.78rem] uppercase tracking-[0.14em]"
        >
          Download résumé →
        </a>
        <p className="font-mono text-[0.72rem] text-[var(--text-tertiary)]">
          off-duty: Valorant ranked · cooking experiments (ask about the pani
          puri) · ongoing PC build
        </p>
      </div>
    </footer>
  );
}
