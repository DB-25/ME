import type { NoteStatus, Project } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { assetUrl } from "@/lib/asset";
import { tie } from "../meta";
import { CaseLabel } from "./CaseLabel";

/** How much weight a status carries, as a tone for its dot: measured, planned, someone's own word, or nothing to show. */
const TONE: Record<NoteStatus, "ok" | "plan" | "self" | "none"> = {
  Measured: "ok",
  Tested: "ok",
  Projected: "plan",
  "Designed, not run": "plan",
  "Instrumented, no results": "plan",
  "Self-reported": "self",
  "Not measured": "none",
  "Private repo": "none",
};

/** Production notes: one hairline row per question a head of engineering asks. A row exists only where a link or a repo fact backs it. */
export function ProductionNotes({ project, n }: { project: Project; n: string }) {
  const notes = project.notes;
  if (!notes?.length) return null;
  return (
    <section id="sec-notes" className="cs-section" data-cs="notes" data-cs-label="Production notes" aria-labelledby="cs-notes">
      <div className="shell grid-12 cs-split">
        <div className="col-span-12 md:col-span-4">
          <div className="cs-sticky">
            <CaseLabel n={n} text="Production notes" />
            <h2 id="cs-notes" className="headline cs-h2 mt-6">
              <Reveal as="span" className="block">
                Behind the numbers
              </Reveal>
            </h2>
          </div>
        </div>
        <Reveal as="div" mode="fade" className="col-span-12 md:col-span-8">
          <dl className="cs-notes">
            {notes.map((note) => (
              <div key={note.label} className="cs-note">
                <dt className="label cs-note-k">{note.label}</dt>
                <dd className="cs-note-v">
                  {note.status ? (
                    <p className="label cs-note-status" data-tone={TONE[note.status]}>
                      {note.status}
                    </p>
                  ) : null}
                  {note.text ? <p className="cs-note-text">{tie(note.text)}</p> : null}
                  {note.lines ? (
                    <ul className="cs-note-lines">
                      {note.lines.map((line) => (
                        <li key={line.lead}>
                          <span className="cs-note-lead">{tie(line.lead)}</span> {tie(line.text)}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {note.links?.length ? (
                    <p className="cs-note-links">
                      {note.links.map((l) => (
                        <a key={l.href} href={assetUrl(l.href)} target="_blank" rel="noopener noreferrer" className="label link cs-note-link" data-cursor="open">
                          {l.label}
                          <span aria-hidden> &#8599;</span>
                        </a>
                      ))}
                    </p>
                  ) : null}
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>
    </section>
  );
}
