import { recognition } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "../origin/FadeIn";
import { AwardList } from "./AwardList";
import { PressIndex } from "./PressIndex";
import { PressMarquee } from "./PressMarquee";

const count = (kind: "award" | "press" | "talk") => recognition.filter((r) => r.kind === kind).length;

/** 05 / Proof. Awards as festival laurels, press as a drifting wall, then the receipts. */
export function Proof() {
  const awards = recognition.filter((r) => r.kind === "award");
  const press = recognition.filter((r) => r.kind === "press");
  const talks = recognition.filter((r) => r.kind === "talk");

  return (
    <section id="proof" data-chapter="proof" aria-labelledby="proof-title" className="relative">
      <div className="shell pt-[clamp(96px,14vw,220px)]">
        <header className="grid-12 gap-y-6">
          <div className="col-span-12 md:col-span-9">
            <SectionLabel chapter="proof" />
            <Reveal as="h2" className="headline mt-5 !text-[clamp(2.5rem,6vw,6rem)]">
              <span id="proof-title">
                Proof, in other people&rsquo;s <Emph>words</Emph>
              </span>
            </Reveal>
          </div>
          <FadeIn delay={0.15} className="col-span-12 md:col-span-3 md:self-end">
            <p className="label leading-[1.9]">
              <span className="text-ink">{count("award")}</span> awards
              <br />
              <span className="text-ink">{count("press")}</span> press features
              <br />
              <span className="text-ink">{count("talk")}</span> talk
            </p>
          </FadeIn>
        </header>

        <div className="mt-[clamp(56px,9vw,140px)]">
          <AwardList items={awards} />
        </div>
      </div>

      <PressMarquee items={press} />

      <div className="shell pb-[clamp(96px,14vw,220px)]">
        <PressIndex items={[...press, ...talks]} />
      </div>
    </section>
  );
}
