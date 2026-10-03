import { BEATS, digitTravel } from "./beats";

const TRAVEL = digitTravel(BEATS);

/**
 * Odometer for the year. Each digit is a strip that only ever rolls forward.
 * Positions are driven from outside through `data-strip` (yPercent, seeded from `data-start`).
 */
export function YearRoll() {
  return (
    <div
      aria-hidden
      className="year-roll flex font-mono font-light leading-none text-ink"
      style={{ fontSize: "min(15vw, 24svh)", letterSpacing: "-0.07em", fontVariantNumeric: "tabular-nums" }}
    >
      {TRAVEL.map((steps, pos) => {
        const cells = steps[steps.length - 1] + 1;
        return (
          <span key={pos} className="relative block h-[0.9em] w-[0.6em] overflow-hidden">
            <span
              data-strip={pos}
              data-start={(-steps[0] / cells) * 100}
              className="absolute left-0 top-[-0.06em] block will-change-transform"
            >
              {Array.from({ length: cells }, (_, k) => (
                <span key={k} className="block h-[1em]">
                  {k % 10}
                </span>
              ))}
            </span>
          </span>
        );
      })}
    </div>
  );
}
