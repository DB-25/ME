import { profile } from "@/content";
import { Reveal } from "@/components/ui/Reveal";

/** The first four manifesto lines. The fifth is a story, and Origin tells it. */
const PRINCIPLES = profile.manifesto.slice(0, 4);

export function Principles() {
  return (
    <div>
      <p className="label">Principles</p>
      <ol className="mt-6 border-b border-hairline">
        {PRINCIPLES.map((text, i) => (
          <li key={text} className="grid-12 gap-y-3 border-t border-hairline py-8 md:py-12">
            <span className="num label col-span-12 md:col-span-2 md:pt-[0.9em]">{String(i + 1).padStart(2, "0")}</span>
            <Reveal
              as="p"
              className="col-span-12 text-[clamp(1.6rem,3.5vw,3.4rem)] font-medium leading-[1.06] tracking-[-0.035em] text-ink text-balance [text-shadow:0_0_24px_rgb(6_5_9/0.9),0_0_3px_rgb(6_5_9/0.5)] md:col-span-9 md:col-start-3"
            >
              {text}
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
