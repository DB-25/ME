import "../fade.css";
import { Reveal } from "@/components/ui/Reveal";
import { Emph } from "@/components/ui/Emph";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Scrim } from "../Scrim";
import { AimTrainer } from "./AimTrainer";
import { BuildingTicker } from "./BuildingTicker";
import { OffDutyFacts } from "./OffDutyFacts";

/**
 * 07 / Off duty. The particle field draws a big crosshair and ring at screen center, so screen one keeps
 * the middle empty: a short stacked headline tucked into the top left corner (inside the ring's gap),
 * the lede bottom right. The drill and the facts live on screen two.
 */
export function OffDuty() {
  return (
    <section
      id="human"
      data-chapter="human"
      aria-labelledby="human-title"
      className="sx-in relative"
    >
      <div className="sx-out pb-[8vh] pt-[16vh] md:pt-[18vh]">
        <div className="shell">
          <div className="flex min-h-[calc(100svh-18vh-56px)] flex-col justify-between gap-10 md:min-h-[calc(100svh-18vh-56px)]">
            <div>
              <SectionLabel chapter="human" className="mb-6" />
              <h2
                id="human-title"
                className="max-w-[5.5em] text-[clamp(2.5rem,3.7vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.04em]"
              >
                <Reveal as="span" className="block">
                  Off the clock, still <Emph>aiming</Emph>.
                </Reveal>
              </h2>
            </div>

            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <p className="label flex items-center gap-3">
                <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-valorant" />
                Aim drill below
              </p>
              <Reveal as="p" mode="fade" delay={0.15} className="lede max-w-[34ch] md:text-[1.0625rem] [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
                Valorant and CS2 are how I reset. I used to stream it, and I still aim fine.
              </Reveal>
            </div>
          </div>

          <div className="grid-12 mt-[8vh] gap-y-14">
            <div className="col-span-12 md:col-span-7 md:col-start-6 md:row-start-1">
              <AimTrainer />
            </div>
            <div className="col-span-12 md:col-span-5 md:col-start-1 md:row-start-1">
              <div className="relative md:pr-6">
                <Scrim shape="left" strength={0.85} inset="-6% -4% -6% -24px" />
                <p className="label mb-6">Notes on the person</p>
                <OffDutyFacts />
              </div>
            </div>
          </div>

          <div className="relative mt-[10vh]">
            <Scrim strength={0.8} inset="-20% -4%" />
            <BuildingTicker />
          </div>
        </div>
      </div>
    </section>
  );
}
