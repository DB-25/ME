import { Reveal } from "@/components/ui/Reveal";
import { FadeIn } from "./FadeIn";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { CITIES } from "./beats";

export function OriginHeader({ withLede = true }: { withLede?: boolean }) {
  return (
    <header>
      <SectionLabel chapter="origin" />
      <Reveal as="h2" className="headline mt-5 !text-[clamp(2.25rem,4.4vw,4.25rem)]">
        <span id="origin-title">
          <span className={CITIES.bangalore.text}>Bangalore</span> to{" "}
          <span className={CITIES.boston.text}>Boston</span>
        </span>
      </Reveal>
      {withLede && (
        <FadeIn delay={0.15} className="lede mt-5 max-w-[34rem] [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
          <p>From shipping a Flutter app to thousands of students to building AI for government.</p>
        </FadeIn>
      )}
    </header>
  );
}
