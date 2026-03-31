"use client";

import { useState, useEffect, useCallback } from "react";
import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Navigation } from "@/components/layout/Navigation";
import { HeroSection } from "@/components/hero/HeroSection";
import { AICommandCenter } from "@/components/ai/AICommandCenter";
import { JourneySection } from "@/components/journey/JourneySection";
import { ProjectsSection } from "@/components/projects/ProjectsSection";
import { SkillsSection } from "@/components/skills/SkillsSection";
import { ImpactSection } from "@/components/impact/ImpactSection";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  const [aiOpen, setAiOpen] = useState(false);

  const openAI = useCallback(() => setAiOpen(true), []);
  const closeAI = useCallback(() => setAiOpen(false), []);

  // Cmd+K / Ctrl+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setAiOpen((prev) => !prev);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SmoothScroll>
      <Navigation onAIClick={openAI} />

      <main>
        <HeroSection onAIClick={openAI} />
        <JourneySection />
        <ProjectsSection />
        <SkillsSection />
        <ImpactSection />
        <Footer />
      </main>

      <AICommandCenter isOpen={aiOpen} onClose={closeAI} />
    </SmoothScroll>
  );
}
