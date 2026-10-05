import { Reveal } from "@/components/ui/Reveal";
import { CaseLabel } from "../../CaseLabel";
import { CourseSandboxLoader } from "./CourseSandboxLoader";
import "./time-travel.css";

/** Course Delivery only: the reminder rules as a sandbox. Scrub eight days, change what a made-up learner does, see what is texted and why. */
export function TimeTravel({ n }: { n: string }) {
  return (
    <section id="sec-timetravel" className="cs-section" data-cs="timetravel" data-cs-label="Try the rules" aria-labelledby="cs-timetravel">
      <div className="shell">
        <div className="grid-12 cs-split">
          <div className="col-span-12 md:col-span-4">
            <CaseLabel n={n} text="Try the rules" />
            <h2 id="cs-timetravel" className="headline cs-h2 cs-h2-long mt-6">
              <Reveal as="span" className="block">
                Scrub the clock. Watch what gets texted.
              </Reveal>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-6 md:col-start-6">
            <Reveal mode="fade">
              <p className="lede">
                A made-up learner and the real reminder rules, played over the eight days. Change what she does, drag the clock, and see which texts go out, which are held back, and which rule decided.
              </p>
            </Reveal>
          </div>
        </div>

        <CourseSandboxLoader />

        <p className="cts-cap">
          Fictional learner, sample sign-in code and link. The rules are written out by hand from the scheduler as of 1 Oct 2026, and its hourly pass is drawn on the hour. The app is pre-launch and nothing here sends a text.
        </p>
      </div>
    </section>
  );
}
