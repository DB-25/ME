import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { CATEGORY_LABEL, pad } from "../meta";
import { CaseLabel } from "./CaseLabel";
import { DrawRule } from "./DrawRule";

/** Title sequence: giant name, tagline, what I owned, hairline in the project accent, mono meta row. */
export function CaseHero({ project, index, total }: { project: Project; index: number; total: number }) {
  const meta = [
    { k: "Year", v: project.year },
    { k: "Role", v: project.role },
    ...(project.org ? [{ k: "With", v: project.org }] : []),
    { k: "Category", v: CATEGORY_LABEL[project.category] },
  ];
  const lead = project.outcomes[0];
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
        <Reveal as="span" immediate delay={0.1} className="block">
          {project.name}
        </Reveal>
      </h1>

      <div className="grid-12 cs-hero-sub">
        <Reveal as="p" mode="fade" immediate delay={0.4} className="lede cs-tagline col-span-12 md:col-span-6">
          {project.tagline}
        </Reveal>
        {(project.owned || lead) && (
          <Reveal mode="fade" immediate delay={0.55} className="cs-owned col-span-12 md:col-span-5 md:col-start-8">
            {project.owned && (
              <section aria-labelledby="cs-owned-k">
                <p id="cs-owned-k" className="label cs-owned-k">
                  What I owned
                </p>
                <p className="cs-owned-v">{project.owned}</p>
              </section>
            )}
            {lead && (
              <p className="cs-lead">
                <span className="cs-lead-v num">{lead.value}</span>
                <span className="cs-lead-l label">{lead.label}</span>
              </p>
            )}
          </Reveal>
        )}
      </div>

      <DrawRule accent immediate delay={0.7} />
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
