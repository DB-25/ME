import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { headlineFor, tie } from "../meta";
import { CaseLabel } from "./CaseLabel";

export function ProblemSection({ project, n }: { project: Project; n: string }) {
  const h = headlineFor(project, "problem", "The problem");
  return (
    <section className="cs-section" data-cs="problem" data-cs-label="The problem" aria-labelledby="cs-problem">
      <div className="shell grid-12 cs-split">
        <div className="col-span-12 md:col-span-4">
          <CaseLabel n={n} text="The problem" />
          <h2 id="cs-problem" className={`headline cs-h2 mt-6${h.long ? " cs-h2-long" : ""}`}>
            <Reveal as="span" className="block">
              {tie(h.text)}
            </Reveal>
          </h2>
        </div>
        <div className="col-span-12 md:col-span-8">
          <Reveal as="p" className="cs-statement">
            {tie(project.problem)}
          </Reveal>
        </div>
      </div>
    </section>
  );
}
