import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";
import { PIPELINE_SOURCE } from "./stages";

export function SystemsHeader() {
  return (
    <header className="grid-12 gap-y-6">
      <div className="relative col-span-12 md:col-span-7">
        <Scrim shape="left" strength={0.82} inset="-14% -4% -14% -24px" />
        <SectionLabel chapter="systems" text="How I build" />
        <Reveal as="h2" className="headline mt-5 !text-[clamp(2.25rem,4.9vw,4.75rem)]">
          <span id="systems-title">Built so people can rely on it</span>
        </Reveal>
        {/* Under the headline, on the left: the network owns the right half, so nothing readable sits there. */}
        <FadeIn delay={0.15} className="mt-6 max-w-[26rem]">
          <p className="label !text-[12px] !text-ink/75">
            Pipeline: {PIPELINE_SOURCE.name}
            <span className="mx-2 text-dim" aria-hidden>
              /
            </span>
            <a
              href={PIPELINE_SOURCE.href}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="read"
              className="link !text-ink/85 hover:!text-accent-hot focus-visible:!text-accent-hot"
            >
              {PIPELINE_SOURCE.hrefLabel}
              <span aria-hidden> &#8599;</span>
            </a>
          </p>
          <p className="lede mt-2 !text-ink/80 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">{PIPELINE_SOURCE.tagline}</p>
        </FadeIn>
      </div>
    </header>
  );
}
