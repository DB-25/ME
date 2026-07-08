import { SmoothScroll } from "@/components/layout/SmoothScroll";
import { Navigation } from "@/components/layout/Navigation";
import { HeroSection } from "@/components/hero/HeroSection";
import { CommandCenter } from "@/components/command/CommandCenter";
import { StorySection } from "@/components/journey/StorySection";
import { WorkSection } from "@/components/projects/WorkSection";
import { StackSection } from "@/components/skills/StackSection";
import { ImpactSection } from "@/components/impact/ImpactSection";
import { Footer } from "@/components/layout/Footer";

export default function Home() {
  return (
    <SmoothScroll>
      <Navigation />

      <main>
        <HeroSection />
        <CommandCenter />
        <StorySection />
        <WorkSection />
        <StackSection />
        <ImpactSection />
        <Footer />
      </main>
    </SmoothScroll>
  );
}
