import "../fade.css";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Scrim } from "../Scrim";
import { AimDisclosure } from "./AimDisclosure";
import { BuildingTicker } from "./BuildingTicker";
import { OffDutyFacts } from "./OffDutyFacts";

/**
 * 07 / Off duty. One screen: the particle field draws a crosshair and ring on the right half, so
 * everything stays in the left column. The aim drill opens on request.
 */
export function OffDuty() {
  return (
    <section id="human" data-chapter="human" aria-labelledby="human-title" className="sx-in relative">
      <div className="sx-out shell pb-[clamp(40px,5vw,72px)] pt-[clamp(56px,7vw,96px)]">
        <div className="relative md:max-w-[min(38rem,48vw)]">
          <Scrim shape="band" strength={0.82} inset="-6% -6% -4% -24px" />
          <SectionLabel chapter="human" className="mb-4" />
          <h2 id="human-title" className="text-[clamp(2rem,3.4vw,3.25rem)] font-medium leading-[0.98] tracking-[-0.04em]">
            <Reveal as="span" className="block">
              Off the clock, <em className="voice">still aiming.</em>
            </Reveal>
          </h2>
          <Reveal as="p" mode="fade" delay={0.15} className="lede mt-4 max-w-[38ch] !text-ink/85 md:text-[1rem] [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
            Valorant and CS2 are how I reset. I used to stream it, and I still aim fine.
          </Reveal>

          <div className="relative mt-6 md:mt-8">
            <OffDutyFacts />
          </div>
          <div className="mt-6">
            <AimDisclosure />
          </div>
        </div>

        <div className="relative mt-[clamp(28px,4vw,48px)]">
          <Scrim strength={0.8} inset="-20% -4%" />
          <BuildingTicker />
        </div>
      </div>
    </section>
  );
}
