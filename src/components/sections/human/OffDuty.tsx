import { Reveal } from "@/components/ui/Reveal";
import { Emph } from "@/components/ui/Emph";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { AimTrainer } from "./AimTrainer";
import { BuildingTicker } from "./BuildingTicker";
import { OffDutyFacts } from "./OffDutyFacts";

/**
 * 07 / Off duty. The particle field draws a big crosshair at screen center, so
 * screen one keeps the middle empty: headline top left, lede bottom right.
 * The drill and the facts live on screen two.
 */
export function OffDuty() {
  return (
    <section
      id="human"
      data-chapter="human"
      aria-labelledby="human-title"
      className="relative pb-[14vh] pt-[16vh] md:pt-[18vh]"
    >
      <div className="shell">
        <div className="flex min-h-[calc(100svh-18vh-56px)] flex-col justify-between gap-10 md:min-h-[calc(100svh-18vh-56px)]">
          <div>
            <SectionLabel chapter="human" className="mb-6" />
            <h2
              id="human-title"
              className="max-w-[7em] text-[clamp(2.75rem,6.4vw,6.75rem)] font-medium leading-[0.96] tracking-[-0.04em]"
            >
              <Reveal as="span" className="block">
                Off the clock, still <Emph>aiming</Emph>.
              </Reveal>
            </h2>
          </div>

          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <p className="label">Aim drill below</p>
            <Reveal as="p" mode="fade" delay={0.15} className="lede max-w-[34ch] md:text-[1.0625rem]">
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
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-4 -left-6 -right-2 -top-4 -z-10 bg-gradient-to-r from-void/85 via-void/75 to-transparent [mask-image:linear-gradient(to_bottom,transparent,#000_8%,#000_92%,transparent)]"
            />
            <p className="label mb-6">Notes on the person</p>
            <OffDutyFacts />
          </div>
          </div>
        </div>

        <div className="mt-[14vh]">
          <BuildingTicker />
        </div>
      </div>
    </section>
  );
}
