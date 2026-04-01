"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { PretextHero } from "./PretextHero";
import { AICommandCenter } from "@/components/ai/AICommandCenter";

interface HeroSectionProps {
  onAIClick?: () => void;
}

export function HeroSection({ onAIClick }: HeroSectionProps) {
  const [aiOpen, setAiOpen] = useState(false);

  return (
    <>
      <section
        className="relative w-full h-screen overflow-hidden"
        style={{ height: "100svh" }}
      >
        {/* Pretext editorial layout */}
        <PretextHero />

        {/* Scroll indicator — simple animated line */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-3">
          <span
            className="text-xs tracking-widest uppercase"
            style={{ color: "var(--text-tertiary)" }}
          >
            Scroll
          </span>
          <motion.div
            className="w-px h-8 bg-[var(--text-tertiary)]"
            initial={{ scaleY: 0, originY: 0 }}
            animate={{ scaleY: [0, 1, 0] }}
            transition={{
              duration: 2.5,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        </div>
      </section>

      {/* AI Command Center modal */}
      <AICommandCenter isOpen={aiOpen} onClose={() => setAiOpen(false)} />
    </>
  );
}
