import type { Recognition } from "@/content";
import { assetUrl } from "@/lib/asset";
import { Scrim } from "../Scrim";

const CSS = `
.press-marquee { -webkit-mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent); mask-image: linear-gradient(90deg, transparent, #000 7%, #000 93%, transparent); }
.press-track { display: flex; width: max-content; animation: press-drift 75s linear infinite; will-change: transform; }
.press-marquee:hover .press-track,
.press-marquee:focus-within .press-track { animation-play-state: paused; }
@keyframes press-drift { to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) {
  .press-marquee { -webkit-mask-image: none; mask-image: none; padding-inline: var(--gutter); }
  .press-track { animation: none !important; width: 100%; }
  .press-track > ul { flex-wrap: wrap; flex-shrink: 1; row-gap: 8px; }
  .press-track > ul li { white-space: normal; }
  .press-dup { display: none; }
}
`;

type Outlet = { name: string; year: string; title: string; href?: string };

/** One entry per outlet, linking to its first article. */
function outlets(items: Recognition[]): Outlet[] {
  const seen = new Map<string, Outlet>();
  for (const r of items) {
    if (!seen.has(r.issuer)) seen.set(r.issuer, { name: r.issuer, year: r.year, title: r.title, href: r.href });
  }
  return [...seen.values()];
}

function Strip({ list, hidden }: { list: Outlet[]; hidden?: boolean }) {
  return (
    <ul
      aria-hidden={hidden || undefined}
      className={`flex shrink-0 items-baseline gap-x-[clamp(32px,5vw,80px)] pr-[clamp(32px,5vw,80px)] md:flex-nowrap ${hidden ? "press-dup" : ""}`}
    >
      {list.map((o) => (
        <li key={o.name} className="shrink-0 whitespace-nowrap">
          <a
            href={o.href && assetUrl(o.href)}
            target="_blank"
            rel="noopener noreferrer"
            tabIndex={-1}
            data-cursor="read"
            title={o.title}
            className="group inline-flex items-baseline gap-3 text-[clamp(2rem,4.8vw,4.75rem)] font-medium leading-none tracking-[-0.045em] text-ink/85 transition-colors duration-300 hover:text-ink focus-visible:text-ink"
          >
            {o.name}
            <span className="label num !text-[12px] !text-ink/65">{o.year}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** A slow, endless drift of outlet names. Pauses on hover, static with reduced motion. Hidden from assistive tech and the tab order (PressIndex is the accessible list). */
export function PressMarquee({ items }: { items: Recognition[] }) {
  const list = outlets(items);
  return (
    <div className="relative mt-[clamp(32px,4vw,56px)]">
      <style>{CSS}</style>
      {/* A soft band, feathered top and bottom, so outlet names never sit on bright particles. */}
      <Scrim shape="band" strength={0.94} inset="14% 0 -6% 0" feather={20} />
      <p className="label shell mb-3 !text-[12px] !text-ink/75">As covered by</p>
      {/* Decorative: the same outlets are listed, focusable, in PressIndex below. */}
      <div aria-hidden className="press-marquee overflow-hidden py-[clamp(12px,2vw,24px)]">
        <div className="press-track">
          <Strip list={list} />
          <Strip list={list} hidden />
        </div>
      </div>
    </div>
  );
}
