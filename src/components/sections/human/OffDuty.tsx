import "../fade.css";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { Scrim } from "../Scrim";
import { AimTrainer } from "./AimTrainer";
import { BuildingTicker } from "./BuildingTicker";
import { OffDutyFacts } from "./OffDutyFacts";

/**
 * 07 / Off duty. The particle field draws a big crosshair and ring at screen center, so screen one keeps
 * the middle empty: a short stacked headline tucked into the top left corner (inside the ring's gap),
 * the lede bottom left under it, so both sit outside the ring. The drill and the facts live on screen two.
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
            <div className="relative">
              <Scrim shape="band" strength={0.82} inset="-10% -10% -10% -24px" />
              <SectionLabel chapter="human" className="mb-6" />
              <h2
                id="human-title"
                className="max-w-[5.5em] text-[clamp(2.5rem,3.7vw,3.75rem)] font-medium leading-[0.98] tracking-[-0.04em]"
              >
                <Reveal as="span" className="block">
                  Off the clock, still aiming.
                </Reveal>
              </h2>
            </div>

            <div className="relative flex flex-col gap-5 md:max-w-[15rem]">
              <Scrim shape="band" strength={0.88} inset="-14% -8% -10% -24px" />
              <p className="label flex items-center gap-3 !text-[12px] !text-ink/75">
                <span aria-hidden className="h-[6px] w-[6px] rounded-full bg-valorant" />
                Aim drill below
              </p>
              <Reveal as="p" mode="fade" delay={0.15} className="lede max-w-[34ch] !text-ink/85 md:text-[1rem] [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">
                Valorant and CS2 are how I reset. I used to stream it, and I still aim fine.
              </Reveal>
            </div>
          </div>

          {/* The ring and crosshair own the right half of the screen, so facts and drill stack in the left column. */}
          <div className="mt-[8vh] flex flex-col gap-14 md:max-w-[min(36rem,42vw)]">
            <div className="relative md:pr-6">
              <Scrim shape="band" strength={0.85} inset="-6% -4% -6% -24px" />
              <p className="label mb-6 !text-[12px] !text-ink/75">Notes on the person</p>
              <OffDutyFacts />
            </div>
            <AimTrainer />
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
