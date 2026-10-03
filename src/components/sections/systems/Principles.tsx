import { profile } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { Scrim } from "../Scrim";

/** The first four manifesto lines. The fifth is a story, and Origin tells it. */
const PRINCIPLES = profile.manifesto.slice(0, 4);

/** Two columns of hairline-ruled principles, set at reading size so they carry weight without shouting. */
export function Principles() {
  return (
    <div className="relative">
      <Scrim strength={0.78} inset="-10% -4%" />
      <p className="label">Principles</p>
      <ol className="mt-6 grid border-b border-hairline md:grid-cols-2 md:gap-x-[var(--gutter)]">
        {PRINCIPLES.map((text, i) => (
          <li key={text} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-t border-hairline py-6 md:py-8">
            <span className="num label pt-[0.55em]">{String(i + 1).padStart(2, "0")}</span>
            <Reveal
              as="p"
              className="text-[clamp(1.25rem,1.9vw,1.75rem)] font-medium leading-[1.25] tracking-[-0.02em] text-ink text-balance"
            >
              {text}
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
