import "./case.css";
import { projects, type Project } from "@/content";
import { pad } from "../meta";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { BuildSection } from "./BuildSection";
import { CaseHero } from "./CaseHero";
import { CaseNav } from "./CaseNav";
import { Gallery } from "./Gallery";
import { LinksList } from "./LinksList";
import { NextProject } from "./NextProject";
import { Outcomes } from "./Outcomes";
import { ProblemSection } from "./ProblemSection";
import { StackList } from "./StackList";

/** Featured projects hand off to the next featured one, lab projects to the next lab one. */
export function neighbours(project: Project) {
  const group = projects.filter((p) => p.featured === project.featured);
  const index = group.findIndex((p) => p.slug === project.slug);
  const next = group[(index + 1) % group.length];
  return { group, index, next, nextIndex: (index + 1) % group.length };
}

export function CaseStudy({ project }: { project: Project }) {
  const { group, index, next, nextIndex } = neighbours(project);

  // Section numbers follow what actually renders, so a project without media still reads 01, 02, 03.
  const present = [
    true,
    true,
    Boolean(project.architecture?.nodes.length),
    project.outcomes.length > 0,
    project.stack.length > 0,
    project.media.length > 0,
    project.links.length > 0,
  ];
  let c = 0;
  const num = present.map((p) => (p ? pad(++c) : ""));

  return (
    <article className="cs" style={{ ["--pa" as string]: project.accent ?? "var(--color-accent)" }}>
      <CaseHero project={project} index={index} total={group.length} />
      <ProblemSection project={project} n={num[0]} />
      <BuildSection project={project} n={num[1]} />
      <ArchitectureDiagram project={project} n={num[2]} />
      <Outcomes project={project} n={num[3]} />
      <StackList project={project} n={num[4]} />
      <Gallery project={project} n={num[5]} />
      <LinksList project={project} n={num[6]} />
      <NextProject next={next} index={nextIndex} total={group.length} />
      <CaseNav name={project.name} nextSlug={next.slug} nextName={next.name} />
    </article>
  );
}
