import "./case.css";
import { projects, type Project } from "@/content";
import { hasCase, pad } from "../meta";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { BuildSection } from "./BuildSection";
import { CaseFilm } from "./CaseFilm";
import { CaseHero } from "./CaseHero";
import { CaseNav, type CaseStop } from "./CaseNav";
import { Gallery } from "./Gallery";
import { LinksList } from "./LinksList";
import { NextProject } from "./NextProject";
import { Outcomes } from "./Outcomes";
import { ProductionNotes } from "./ProductionNotes";
import { ProblemSection } from "./ProblemSection";
import { StackList } from "./StackList";
import { WhoSeesWhat } from "./demos/WhoSeesWhat";

/** Featured projects hand off to the next featured one, lab projects to the next lab one. */
export function neighbours(project: Project) {
  const group = projects.filter((p) => hasCase(p) && p.featured === project.featured);
  const index = group.findIndex((p) => p.slug === project.slug);
  const next = group[(index + 1) % group.length];
  return { group, index, next, nextIndex: (index + 1) % group.length };
}

export function CaseStudy({ project }: { project: Project }) {
  const { group, index, next, nextIndex } = neighbours(project);

  // Section numbers follow what actually renders, so a project without media still reads 01, 02, 03.
  const hasArchitecture = Boolean(project.architecture?.nodes.length || project.architecture?.lanes?.length);
  // The interactive data-boundary demo belongs to A-IEP only.
  const hasDemo = project.slug === "a-iep";
  const present = [
    true,
    true,
    hasArchitecture,
    hasDemo,
    project.outcomes.length > 0,
    Boolean(project.notes?.length),
    project.stack.length > 0,
    project.media.length > 0,
    project.links.length > 0,
  ];
  let c = 0;
  const num = present.map((p) => (p ? pad(++c) : ""));

  // The dock's section menu. Keys and labels match each section's data-cs / data-cs-label.
  const stops: CaseStop[] = [
    { key: "top", label: "Overview", n: "" },
    ...(project.film ? [{ key: "film", label: "Film", n: "" }] : []),
    { key: "problem", label: "The problem", n: num[0] },
    { key: "build", label: "What I built", n: num[1] },
    ...(hasArchitecture ? [{ key: "architecture", label: "Architecture", n: num[2] }] : []),
    ...(hasDemo ? [{ key: "whosees", label: "Who sees what", n: num[3] }] : []),
    ...(present[4] ? [{ key: "outcomes", label: "Outcomes", n: num[4] }] : []),
    ...(present[5] ? [{ key: "notes", label: "Production notes", n: num[5] }] : []),
    ...(present[6] ? [{ key: "stack", label: "Stack", n: num[6] }] : []),
    ...(present[7] ? [{ key: "gallery", label: "In use", n: num[7] }] : []),
    ...(present[8] ? [{ key: "links", label: "Links", n: num[8] }] : []),
    { key: "next", label: "Up next", n: "" },
  ];

  return (
    <article className="cs">
      <CaseHero project={project} index={index} total={group.length} />
      <CaseFilm project={project} />
      <ProblemSection project={project} n={num[0]} />
      <BuildSection project={project} n={num[1]} />
      <ArchitectureDiagram project={project} n={num[2]} />
      {hasDemo ? <WhoSeesWhat n={num[3]} /> : null}
      <Outcomes project={project} n={num[4]} />
      <ProductionNotes project={project} n={num[5]} />
      <StackList project={project} n={num[6]} />
      <Gallery project={project} n={num[7]} />
      <LinksList project={project} n={num[8]} />
      <NextProject next={next} index={nextIndex} total={group.length} />
      <CaseNav name={project.name} nextSlug={next.slug} nextName={next.name} stops={stops} />
    </article>
  );
}
