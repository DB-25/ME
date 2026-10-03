import { FadeIn } from "./FadeIn";
import { BEATS, CITIES } from "./beats";
import { OriginHeader } from "./OriginHeader";

/** Unpinned layout: phones, reduced motion, no JavaScript. Every beat is readable at once. */
export function StaticJourney() {
  return (
    <div className="shell py-[clamp(88px,12vw,180px)]">
      <OriginHeader />
      <p className="label mt-8 flex flex-wrap gap-x-8 gap-y-1">
        {(["bangalore", "boston"] as const).map((id) => (
          <span key={id}>
            <span className={CITIES[id].text}>{CITIES[id].name}</span>
            <span className="ml-3">{CITIES[id].coords}</span>
          </span>
        ))}
      </p>
      <ol className="mt-12 md:mt-20">
        {BEATS.map((b) => {
          const city = CITIES[b.city];
          return (
            <li key={b.id} className="border-t border-hairline py-9 md:py-12">
              <FadeIn className="grid-12 gap-y-4">
                <div className="col-span-12 md:col-span-3">
                  <p className="num font-mono text-[clamp(3.5rem,18vw,5.5rem)] font-light leading-[0.9] text-ink md:text-[5.5rem]">{b.year}</p>
                  <p className={`label mt-4 ${city.label}`}>{b.place}</p>
                </div>
                <div className="col-span-12 md:col-span-5">
                  <h3 className="text-[clamp(1.35rem,4vw,2rem)] font-medium leading-[1.1] tracking-[-0.03em] text-ink">{b.title}</h3>
                  {b.org && <p className="label mt-3">{b.org}</p>}
                  <p className="mt-4 max-w-[34rem] text-[1.0625rem] leading-[1.55] text-ink/70 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_26px_rgb(6_5_9/0.9)]">{b.body}</p>
                </div>
              </FadeIn>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
