import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { headlineFor, tie } from "../meta";
import { ArchLane } from "./ArchLane";
import { CaseLabel } from "./CaseLabel";

type Lane = { name?: string; nodes: string[] };

/**
 * One lane per system. Explicit `lanes` win; otherwise a "|" entry in `nodes` splits two systems;
 * otherwise it is a single pipeline.
 */
function lanesOf(arch: NonNullable<Project["architecture"]>): Lane[] {
  if (arch.lanes?.length) return arch.lanes.filter((l) => l.nodes.length);
  const groups: string[][] = [[]];
  for (const node of arch.nodes) {
    if (node.trim() === "|") groups.push([]);
    else groups[groups.length - 1].push(node);
  }
  const lanes = groups.filter((g) => g.length).map((nodes) => ({ nodes }));
  return lanes.length ? lanes : [{ nodes: arch.nodes }];
}

/** Architecture section: the flow sentence, then one drawn pipeline per system. */
export function ArchitectureDiagram({ project, n }: { project: Project; n: string }) {
  const arch = project.architecture;
  if (!arch?.nodes.length && !arch?.lanes?.length) return null;
  const h = headlineFor(project, "flows", "How it flows");
  const lanes = lanesOf(arch);
  const multi = lanes.length > 1;

  return (
    <section id="sec-architecture" className="cs-section cs-section-arch" data-cs="architecture" data-cs-label="Architecture" aria-labelledby="cs-arch">
      <div className="shell">
        <div className="grid-12 cs-split">
          <div className="col-span-12 md:col-span-4">
            <CaseLabel n={n} text="Architecture" />
            <h2 id="cs-arch" className={`headline cs-h2 mt-6${h.long ? " cs-h2-long" : ""}`}>
              <Reveal as="span" className="block">
                {tie(h.text)}
              </Reveal>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-6 md:col-start-6">
            <Reveal mode="fade">
              <p className="lede">{tie(arch.flow)}</p>
            </Reveal>
          </div>
        </div>

        {lanes.map((lane, i) => (
          <div key={i} className="cs-lane">
            {multi ? (
              <p className="label cs-lane-name">
                <span className="text-accent">{String.fromCharCode(65 + i)}</span>
                <span className="mx-2 text-dim">/</span>
                {lane.name ?? `System ${i + 1}`}
              </p>
            ) : null}
            <ArchLane nodes={lane.nodes} label={`Architecture of ${project.name}${lane.name ? `, ${lane.name}` : ""}`} />
          </div>
        ))}
      </div>
    </section>
  );
}
