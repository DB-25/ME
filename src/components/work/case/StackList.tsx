import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { CaseLabel } from "./CaseLabel";

export function StackList({ project, n }: { project: Project; n: string }) {
  if (!project.stack.length) return null;
  return (
    <section id="sec-stack" className="cs-section" data-cs="stack" data-cs-label="Stack" aria-labelledby="cs-stack">
      <div className="shell grid-12 cs-split">
        <div className="col-span-12 md:col-span-4">
          <CaseLabel n={n} text="Stack" />
          <h2 id="cs-stack" className="headline cs-h2 mt-6">
            <Reveal as="span" className="block">
              Built with
            </Reveal>
          </h2>
        </div>
        <Reveal as="div" mode="fade" className="col-span-12 md:col-span-8">
          <ul className="cs-stack">
            {project.stack.map((s) => (
              <li key={s}>{s}</li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
