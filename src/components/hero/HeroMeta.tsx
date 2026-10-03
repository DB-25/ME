"use client";

import { useEffect, useState } from "react";

const COORDS = "42.3601° N, 71.0589° W";
const TZ = "America/New_York";

const fmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hourCycle: "h23",
  timeZoneName: "short",
});

function bostonNow(): string {
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${get("hour")}:${get("minute")}:${get("second")} ${get("timeZoneName")}`;
}

/** Live Boston time. Renders a fixed-width placeholder until mounted (no hydration mismatch). */
function BostonTime() {
  const [now, setNow] = useState("--:--:-- ---");
  useEffect(() => {
    const tick = () => setNow(bostonNow());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, []);
  return <span className="num font-mono">{now}</span>;
}

type Props = { location: string; origin: string };

/** Mono metadata ledger: location, live local time, coordinates, origin. */
export function HeroLedger({ location, origin }: Props) {
  const rows: { k: string; v: React.ReactNode }[] = [
    { k: "Location", v: location },
    { k: "Local", v: <BostonTime /> },
    { k: "Coords", v: <span className="num font-mono">{COORDS}</span> },
    { k: "From", v: origin },
  ];
  return (
    <dl className="grid w-full grid-cols-2 gap-x-4 gap-y-3 md:w-[min(14vw,16rem)] md:grid-cols-1 md:gap-y-0">
      {rows.map((r) => (
        <div key={r.k} data-meta className="border-t border-hairline-strong pt-2 md:py-3">
          <dt className="label mb-1 !text-muted">{r.k}</dt>
          <dd className="label !text-ink">{r.v}</dd>
        </div>
      ))}
    </dl>
  );
}

/** Thin line with a sweeping highlight plus the word SCROLL. */
export function ScrollCue() {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="relative block h-px w-14 overflow-hidden bg-hairline-strong">
        <span className="hero-cue-sweep absolute inset-y-0 left-0 w-1/2 bg-accent-hot" />
      </span>
      <span className="label !text-muted">Scroll</span>
    </div>
  );
}
