import { profile } from "@/content";
import { Reveal } from "@/components/ui/Reveal";
import { Scrim } from "../Scrim";

/** The three strongest manifesto lines: reliability, privacy, measurement. The rest live in the work itself, and Origin tells the fifth. */
const PRINCIPLE_PICKS = [0, 2, 3];
const PRINCIPLES = PRINCIPLE_PICKS.flatMap((i) => profile.manifesto[i] ?? []);

/** One column of hairline-ruled principles on the left half, so the network on the right never runs through them. */
export function Principles() {
  return (
    <div className="relative md:max-w-[52%]">
      <Scrim shape="hold" strength={0.92} inset="-8% -22% -8% -28px" />
      <p className="label !text-[12px] !text-ink/70">Principles</p>
      <ol className="mt-4 border-b border-hairline">
        {PRINCIPLES.map((text, i) => (
          <li key={text} className="grid grid-cols-[2.25rem_1fr] gap-x-3 border-t border-hairline py-4 md:py-5">
            <span className="num label pt-[0.55em]">{String(i + 1).padStart(2, "0")}</span>
            <Reveal
              as="p"
              className="text-[clamp(1.125rem,1.7vw,1.5rem)] font-medium leading-[1.25] tracking-[-0.02em] text-ink text-balance"
            >
              {text}
            </Reveal>
          </li>
        ))}
      </ol>
    </div>
  );
}
