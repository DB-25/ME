import "../fade.css";
import { recognition } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "../origin/FadeIn";
import { Scrim } from "../Scrim";
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
    <section id="proof" data-chapter="proof" aria-labelledby="proof-title" className="sx-in relative">
      <div className="sx-out">
        <div className="shell pt-[clamp(56px,7vw,104px)]">
          <header className="grid-12 gap-y-6">
            <div className="relative col-span-12 md:col-span-7">
              <Scrim shape="left" strength={0.85} inset="-12% -8% -12% -24px" />
              <SectionLabel chapter="proof" />
              <h2 id="proof-title" className="headline mt-5 !text-[clamp(2.25rem,4.6vw,4.5rem)]">
                <Reveal as="span" className="block">
                  Proof, in <em className="voice">other people&rsquo;s</em> words
                </Reveal>
              </h2>
              <FadeIn delay={0.15} className="label mt-6 flex flex-wrap gap-x-6 gap-y-1 !text-[12px] !text-ink/75">
                <span>
                  <span className="text-ink">{count("award")}</span> awards
                </span>
                <span>
                  <span className="text-ink">{count("press")}</span> press features
                </span>
                <span>
                  <span className="text-ink">{count("talk")}</span> {count("talk") === 1 ? "talk" : "talks"}
                </span>
              </FadeIn>
            </div>
            {/* The orbit rings dock here (see signal/docks.ts): they frame the header and scroll away with it, never under the rows. */}
            <div
              aria-hidden
              data-field-dock="proof"
              className="pointer-events-none order-first col-span-12 -mt-2 h-[120px] md:order-none md:col-span-5 md:col-start-8 md:mt-0 md:h-auto md:min-h-[220px]"
            />
          </header>

          <div className="mt-[clamp(28px,4vw,56px)]">
            <AwardList items={awards} />
          </div>
        </div>

        <PressMarquee items={press} />

        <div className="shell pb-[clamp(56px,7vw,104px)]">
          <PressIndex items={[...press, ...talks]} />
        </div>
      </div>
    </section>
  );
}
