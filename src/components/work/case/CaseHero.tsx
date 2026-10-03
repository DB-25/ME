import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { CATEGORY_LABEL, pad } from "../meta";
import { CaseLabel } from "./CaseLabel";
import { DrawRule } from "./DrawRule";

/** Title sequence: giant name, tagline, hairline in the project accent, mono meta row. */
export function CaseHero({ project, index, total }: { project: Project; index: number; total: number }) {
  const meta = [
    { k: "Year", v: project.year },
    { k: "Role", v: project.role },
    ...(project.org ? [{ k: "With", v: project.org }] : []),
    { k: "Category", v: CATEGORY_LABEL[project.category] },
  ];
  return (
    <header className="cs-hero shell" id="top">
      <div className="cs-hero-top">
        <CaseLabel n="03" text={`Work, ${project.featured ? "selected" : "the lab"}`} />
        <p className="label num cs-index" aria-label={`Project ${index + 1} of ${total}`}>
          <span className="cs-index-n">{pad(index + 1)}</span>
          <span className="text-dim"> / {pad(total)}</span>
        </p>
      </div>

      <h1 className="cs-title" style={{ ["--len" as string]: project.name.length }}>
        <Reveal as="span" immediate delay={0.25} className="block">
          {project.name}
        </Reveal>
      </h1>

      <div className="grid-12 cs-hero-sub">
        <Reveal as="p" mode="fade" immediate delay={0.7} className="lede cs-tagline col-span-12 md:col-span-7">
          {project.tagline}
        </Reveal>
      </div>

      <DrawRule accent immediate delay={0.9} />
      <dl className="cs-meta">
        {meta.map((m) => (
          <div key={m.k}>
            <dt className="label">{m.k}</dt>
            <dd>{m.v}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
