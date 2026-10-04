import { profile } from "@/content";

const CSS = `
@keyframes building-slide { from { transform: translateX(0); } to { transform: translateX(-50%); } }
/* Full bleed, so the strip is never cut at the column edge. The track starts inside the fade, so item 01 is whole on load. */
.building-viewport { margin-inline: calc(var(--gutter) * -1); }
.building-track { animation: building-slide 70s linear infinite; margin-left: calc(var(--gutter) + clamp(0px, 5vw, 96px)); }
.building-viewport:hover .building-track, .building-viewport:focus-within .building-track { animation-play-state: paused; }
@keyframes building-blink { 0%, 100% { opacity: 1; } 50% { opacity: .25; } }
.building-dot { animation: building-blink 1.8s ease-in-out infinite; }
@media (prefers-reduced-motion: reduce) {
  .building-track { animation: none !important; width: auto !important; display: block !important; margin-inline: var(--gutter); }
  .building-track ul { flex-wrap: wrap; row-gap: 14px; }
  .building-copy-2 { display: none; }
  .building-viewport { mask-image: none !important; -webkit-mask-image: none !important; }
}
`;

const EDGE = "clamp(32px, 9vw, 160px)";
const MASK = `linear-gradient(90deg, transparent, #000 ${EDGE}, #000 calc(100% - ${EDGE}), transparent)`;

function Items({ hidden }: { hidden?: boolean }) {
  return (
    <ul aria-hidden={hidden} className={`flex shrink-0 items-center ${hidden ? "building-copy-2" : ""}`}>
      {profile.currentlyBuilding.map((item, i) => (
        <li key={item} className="flex items-baseline gap-4 pr-12 md:pr-16">
          <span className="label !text-accent">{String(i + 1).padStart(2, "0")}</span>
          <span className="whitespace-nowrap text-[clamp(1.125rem,1.8vw,1.5rem)] tracking-[-0.02em] text-ink motion-reduce:whitespace-normal">
            {item}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Marquee of what is on the bench right now. Pauses on hover; static list with reduced motion. */
export function BuildingTicker() {
  return (
    <div aria-label="Currently building" role="region">
      <style>{CSS}</style>
      <p className="label mb-3 flex items-center gap-3">
        <span aria-hidden className="building-dot h-[6px] w-[6px] bg-accent" />
        Currently building
      </p>
      <div
        className="building-viewport overflow-clip border-y border-hairline py-4"
        style={{ maskImage: MASK, WebkitMaskImage: MASK }}
      >
        <div className="building-track flex w-max">
          <Items />
          <Items hidden />
        </div>
      </div>
    </div>
  );
}
