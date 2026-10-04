import { FadeIn } from "./FadeIn";
import { BEATS, CITIES } from "./beats";
import { OriginHeader } from "./OriginHeader";

/** Unpinned layout: phones, reduced motion, no JavaScript. Every beat is readable at once. */
export function StaticJourney() {
  return (
    <div className="shell py-[clamp(64px,7vw,104px)]">
      <OriginHeader />
      <p className="label mt-6 flex flex-wrap gap-x-8 gap-y-1">
        {(["bangalore", "boston"] as const).map((id) => (
          <span key={id}>
            <span className={CITIES[id].text}>{CITIES[id].name}</span>
            <span className="ml-3">{CITIES[id].coords}</span>
          </span>
        ))}
      </p>
      <ol className="mt-8 md:mt-12">
        {BEATS.map((b) => {
          const city = CITIES[b.city];
          return (
            <li key={b.id} className="border-t border-hairline py-6 md:py-8">
              <FadeIn className="grid-12 gap-y-3">
                <div className="col-span-12 flex items-baseline gap-x-4 md:col-span-3 md:block">
                  <p className="num font-mono text-[2.25rem] font-light leading-[0.9] text-ink md:text-[3.5rem]">{b.year}</p>
                  <p className={`label md:mt-4 ${city.label}`}>{b.place}</p>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <h3 className="text-[clamp(1.25rem,3.6vw,1.75rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">{b.title}</h3>
                  {b.org && <p className="label mt-2">{b.org}</p>}
                  <p className="mt-3 max-w-[34rem] text-[1rem] leading-[1.5] text-ink/80 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">{b.body}</p>
                </div>
              </FadeIn>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
