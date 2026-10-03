import type { Recognition } from "@/content";
import { assetUrl } from "@/lib/asset";
import { Scrim } from "../Scrim";

const KIND_LABEL: Record<Recognition["kind"], string> = { award: "Award", press: "Press", talk: "Talk" };

/** The press and talk record as a plain, linked ledger. */
export function PressIndex({ items }: { items: Recognition[] }) {
  return (
    <div className="relative mt-[clamp(56px,8vw,120px)]">
      <Scrim shape="left" strength={0.85} inset="-4% -3% -4% -24px" />
      <p className="label mb-6">Press and talks</p>
      <ul className="border-b border-hairline">
        {items.map((r) => {
          const row = (
            <div className="grid-12 gap-y-2 py-5 md:py-6 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_28px_rgb(6_5_9/0.9)]">
              <p className="label num col-span-3 md:col-span-1">{r.year}</p>
              <p className="label col-span-9 !text-ink md:col-span-3">
                {r.issuer}
                <span className="ml-3 !text-dim">{KIND_LABEL[r.kind]}</span>
              </p>
              <div className="col-span-12 md:col-span-7">
                <p className="group-hover:text-accent-hot group-focus-visible:text-accent-hot text-[clamp(1.0625rem,1.5vw,1.375rem)] leading-[1.3] tracking-[-0.02em] text-ink transition-colors duration-300">{r.title}</p>
                {r.note && <p className="mt-2 max-w-[34rem] text-[0.9375rem] leading-[1.5] text-ink/70">{r.note}</p>}
              </div>
              {r.href && (
                <span aria-hidden className="label col-span-1 hidden justify-self-end !text-[14px] md:block">
                  &#8599;
                </span>
              )}
            </div>
          );
          return (
            <li key={r.title} className="border-t border-hairline">
              {r.href ? (
                <a
                  href={assetUrl(r.href)}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="read"
                  className="group block"
                >
                  {row}
                </a>
              ) : (
                row
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
