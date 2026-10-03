import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "../origin/FadeIn";
import { PIPELINE_SOURCE } from "./stages";

export function SystemsHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className="grid-12 gap-y-6">
      <div className={`col-span-12 ${compact ? "md:col-span-8" : "md:col-span-7"}`}>
        <SectionLabel chapter="systems" text="How I build" />
        <Reveal as="h2" className={`headline mt-5 ${compact ? "!text-[clamp(2rem,3.5vw,3.5rem)]" : "!text-[clamp(2.25rem,4.9vw,4.75rem)]"}`}>
          <span id="systems-title">
            Built so people can <Emph>rely</Emph> on it
          </span>
        </Reveal>
      </div>
      <FadeIn
        delay={0.15}
        className={`col-span-12 md:col-start-9 md:col-span-4 ${compact ? "md:text-right" : "md:self-end"}`}
      >
        <p className="label">Architecture: {PIPELINE_SOURCE.name}</p>
        <p className={`mt-3 text-muted ${compact ? "ml-auto max-w-[19rem] text-[0.9375rem] leading-[1.45]" : "lede"}`}>
          {PIPELINE_SOURCE.tagline}
        </p>
      </FadeIn>
    </header>
  );
}
