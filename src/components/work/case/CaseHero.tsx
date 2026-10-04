import type { Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { CATEGORY_LABEL, pad, tie, titleLen } from "../meta";
import { CaseLabel } from "./CaseLabel";
import { DrawRule } from "./DrawRule";

const NBSP = "\u00a0";
/**
 * Long names get one chosen break point: words are glued inside two near-equal halves, so "Civic AI Course Delivery"
 * reads "Civic AI / Course Delivery" in every browser (Safari's balance and the line split otherwise disagree).
 * When the whole name fits, it still sits on one line.
 */
function breakTitle(name: string): string {
  const words = name.split(" ");
  if (words.length < 3) return name;
  const halves = (i: number) => [words.slice(0, i).join(" ").length, words.slice(i).join(" ").length];
  let best = 1;
  for (let i = 2; i < words.length; i++) {
    const [a, b] = halves(i);
    const [bestA, bestB] = halves(best);
    // Most even split wins; a tie keeps the longer half last.
    if (Math.max(a, b) < Math.max(bestA, bestB) || (Math.max(a, b) === Math.max(bestA, bestB) && a < bestA)) best = i;
  }
  return `${words.slice(0, best).join(NBSP)} ${words.slice(best).join(NBSP)}`;
}

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

      <div className="cs-hero-body">
        <div className="cs-hero-main">
          <h1 className="cs-title" style={{ ["--len" as string]: titleLen(project.name) }}>
            <Reveal as="span" immediate keepSpaces delay={0.1} className="block">
              {breakTitle(project.name)}
            </Reveal>
          </h1>
          <Reveal as="p" mode="fade" immediate delay={0.4} className="lede cs-tagline">
            {tie(project.tagline)}
          </Reveal>
        </div>
        {(project.owned || lead) && (
          <Reveal mode="fade" immediate delay={0.55} className="cs-owned">
            {project.owned && (
              <section aria-labelledby="cs-owned-k">
                <p id="cs-owned-k" className="label cs-owned-k">
                  What I owned
                </p>
                <p className="cs-owned-v">{tie(project.owned)}</p>
              </section>
            )}
            {lead && (
              <p className="cs-lead">
                <span className="cs-lead-v num" data-one={lead.value.startsWith("1") ? "" : undefined}>
                  {lead.value}
                </span>
                <span className="cs-lead-l label">{tie(lead.label)}</span>
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
            <dd>{tie(m.v)}</dd>
          </div>
        ))}
      </dl>
    </header>
  );
}
