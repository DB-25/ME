import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";
import { PIPELINE_SOURCE } from "./stages";

export function SystemsHeader() {
  return (
    <header className="grid-12 gap-y-6">
      <div className="relative col-span-12 md:col-span-7">
        <Scrim shape="left" strength={0.78} inset="-14% -4% -14% -24px" />
        <SectionLabel chapter="systems" text="How I build" />
        <Reveal as="h2" className="headline mt-5 !text-[clamp(2.25rem,4.9vw,4.75rem)]">
          <span id="systems-title">Built so people can rely on it</span>
        </Reveal>
      </div>
      <FadeIn delay={0.15} className="relative col-span-12 md:col-span-4 md:col-start-9 md:self-end">
        <Scrim strength={0.7} />
        <p className="label">Architecture: {PIPELINE_SOURCE.name}</p>
        <p className="lede mt-3 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">{PIPELINE_SOURCE.tagline}</p>
      </FadeIn>
    </header>
  );
}
