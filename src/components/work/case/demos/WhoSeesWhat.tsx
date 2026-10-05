import { Reveal } from "@/components/ui/Reveal";
import { REPO } from "@/content";
import { assetUrl } from "@/lib/asset";
import { CaseLabel } from "../CaseLabel";
import { DemoLoader } from "./DemoLoader";
import "./who-sees-what.css";

const SOURCES = [
  { label: "Redactor source", href: REPO.aiepRedactor },
  { label: "Redaction design doc", href: REPO.aiepRedactionPlan },
];

/** A-IEP only: one fictional page followed through the real pipeline, with what each vendor reads at every stage. */
export function WhoSeesWhat({ n }: { n: string }) {
  return (
    <section id="sec-whosees" className="cs-section" data-cs="whosees" data-cs-label="Who sees what" aria-labelledby="cs-whosees">
      <div className="shell">
        <div className="grid-12 cs-split">
          <div className="col-span-12 md:col-span-4">
            <CaseLabel n={n} text="Who sees what" />
            <h2 id="cs-whosees" className="headline cs-h2 cs-h2-long mt-6">
              <Reveal as="span" className="block">
                Follow one page through the pipeline.
              </Reveal>
            </h2>
          </div>
          <div className="col-span-12 md:col-span-6 md:col-start-6">
            <Reveal mode="fade">
              <p className="lede">A made-up IEP excerpt, stepped through the real stages. At each one: which vendor reads the text, and what is on the page when they do.</p>
            </Reveal>
          </div>
        </div>

        <DemoLoader />

        <p className="wss-cap">
          Fictional sample, not a real student. The replacements apply the redactor&rsquo;s rules by hand, and how many identifiers it misses is not measured yet. The sample includes a date of birth, a diagnosis and a school name on purpose, to show what the redactor keeps or may miss.
        </p>
        <p className="wss-src">
          {SOURCES.map((l) => (
            <a key={l.href} href={assetUrl(l.href)} target="_blank" rel="noopener noreferrer" className="label link wss-src-link" data-cursor="open">
              {l.label}
              <span aria-hidden> &#8599;</span>
            </a>
          ))}
        </p>
      </div>
    </section>
  );
}
