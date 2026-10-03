import type { Project } from "@/content";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { KIND_LABEL } from "../meta";
import { CaseLabel } from "./CaseLabel";
import { assetUrl } from "@/lib/asset";

export function LinksList({ project, n }: { project: Project; n: string }) {
  if (!project.links.length) return null;
  return (
    <section className="cs-section" data-cs="links" data-cs-label="Links" aria-labelledby="cs-links">
      <div className="shell grid-12 cs-split">
        <div className="col-span-12 md:col-span-4">
          <CaseLabel n={n} text="Links" />
          <h2 id="cs-links" className="headline cs-h2 mt-6">
            <Reveal as="span" className="block">
              Go <Emph>deeper</Emph>
            </Reveal>
          </h2>
        </div>
        <Reveal as="div" mode="fade" className="col-span-12 md:col-span-8">
          <ul className="cs-links">
            {project.links.map((l) => (
              <li key={l.href}>
                <a href={assetUrl(l.href)} target="_blank" rel="noopener noreferrer" data-cursor="open">
                  <span className="label">{l.kind ? KIND_LABEL[l.kind] : "Link"}</span>
                  <span className="cs-link-label">{l.label}</span>
                  <span className="cs-link-arrow" aria-hidden>
                    &#8599;
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
