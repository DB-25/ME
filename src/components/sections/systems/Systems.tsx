import "../fade.css";
import { Principles } from "./Principles";
import { ReadingZone } from "./ReadingZone";
import { StackIndex } from "./StackIndex";
import { SystemsFlow } from "./SystemsFlow";
import { SystemsHeader } from "./SystemsHeader";

/**
 * 04 / How I build. A single flowing line through the five stages on the left half (the particle network
 * owns the right), then the principles and a short stack list.
 */
export function Systems() {
  return (
    <section id="systems" data-chapter="systems" aria-labelledby="systems-title" className="sx-in relative">
      <div className="sx-out shell flex flex-col gap-[clamp(40px,5vw,72px)] py-[clamp(56px,7vw,104px)]">
        <div className="flex flex-col gap-[clamp(28px,4vw,48px)]">
          <SystemsHeader />
          <div className="grid-12">
            <div className="col-span-12 md:col-span-6">
              <SystemsFlow />
            </div>
          </div>
        </div>
        <ReadingZone className="flex flex-col gap-[clamp(32px,4vw,56px)]">
          <Principles />
          <StackIndex />
        </ReadingZone>
      </div>
    </section>
  );
}
