"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ParticleField } from "./ParticleField";
import { TypewriterTagline } from "./TypewriterTagline";
import { AIOrb } from "./AIOrb";
import { AICommandCenter } from "@/components/ai/AICommandCenter";

// ---------------------------------------------------------------------------
// Animation variants
// ---------------------------------------------------------------------------

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (delay: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.8,
      delay,
      ease: [0.25, 0.46, 0.45, 0.94] as const, // --ease-out-smooth
    },
  }),
};

const chevronBounce = {
  initial: { y: 0, opacity: 0.6 },
  animate: {
    y: [0, 8, 0],
    opacity: [0.6, 1, 0.6],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HeroSectionProps {
  onAIClick?: () => void;
}

export function HeroSection({ onAIClick }: HeroSectionProps) {
  const [aiOpen, setAiOpen] = useState(false);
  const [subtitleVisible, setSubtitleVisible] = useState(false);

  // Show subtitle after typewriter finishes (~text length * 40ms + delay + buffer)
  useEffect(() => {
    const taglineText = "Building AI That Matters";
    const typingDuration = taglineText.length * 40 + 600 + 400; // delay + typing + buffer
    const timer = setTimeout(() => setSubtitleVisible(true), typingDuration);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <section
        className="relative w-full h-screen overflow-hidden"
        style={{ height: "100svh" }}
      >
        {/* Particle background */}
        <ParticleField />

        {/* Centered content */}
        <div className="relative z-10 flex flex-col items-center justify-center h-full px-6 text-center">
          {/* Name */}
          <motion.h1
            className="text-display"
            style={{ color: "var(--text-primary)" }}
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.2}
          >
            Dhruv Kamalesh Kumar
          </motion.h1>

          {/* Typewriter tagline */}
          <motion.div
            className="mt-6"
            variants={fadeInUp}
            initial="hidden"
            animate="visible"
            custom={0.5}
          >
            <TypewriterTagline
              text="Building AI That Matters"
              delay={600}
              className="text-h3"
              speed={40}
            />
          </motion.div>

          {/* Subtitle */}
          <motion.p
            className="mt-4 text-body"
            style={{ color: "var(--text-secondary)" }}
            initial={{ opacity: 0, y: 10 }}
            animate={
              subtitleVisible
                ? { opacity: 1, y: 0 }
                : { opacity: 0, y: 10 }
            }
            transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as const }}
          >
            Gen AI Engineer | Burnes Center for Social Change
          </motion.p>
        </div>

        {/* AI Orb */}
        <AIOrb onClick={() => { setAiOpen(true); onAIClick?.(); }} />

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            Scroll
          </span>
          <motion.svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ color: "var(--text-tertiary)" }}
            variants={chevronBounce}
            initial="initial"
            animate="animate"
          >
            <polyline points="6 9 12 15 18 9" />
          </motion.svg>
        </div>
      </section>

      {/* AI Command Center modal */}
      <AICommandCenter isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
