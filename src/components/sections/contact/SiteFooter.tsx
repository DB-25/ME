"use client";

import { useEffect, useState } from "react";
import { ColophonTrigger } from "@/components/colophon/ColophonTrigger";
import { scrollToTarget } from "@/lib/motion";

const TICK_MS = 15_000;
const BUILT_WITH = "Built with Next.js, three.js, GSAP. Designed and engineered by DB.";

const formatBoston = () =>
  new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZoneName: "short",
  }).format(new Date());

/** Fixed-width placeholder until mounted so server and client markup match. */
function BostonClock() {
  const [now, setNow] = useState("");
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- client-only clock, placeholder until mounted
    setNow(formatBoston());
    const id = window.setInterval(() => setNow(formatBoston()), TICK_MS);
    return () => window.clearInterval(id);
  }, []);
  return (
    <p className="label !text-[12px] !text-ink/70">
      Boston <span className="num inline-block min-w-[9ch] text-ink">{now || "--:-- ---"}</span>
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
        <p className="label !text-[12px] !text-ink/70">&copy; 2026 Dhruv Kamalesh Kumar</p>
        <BostonClock />
        <ColophonTrigger className="label link inline-flex w-fit text-left !text-[12px] !text-ink/70 hover:!text-ink pointer-coarse:min-h-11 pointer-coarse:items-center" />
        <button type="button" onClick={() => scrollToTarget("#hero")} className="label link inline-flex w-fit text-left !text-[12px] !text-ink/70 hover:!text-ink pointer-coarse:min-h-11 pointer-coarse:items-center">
          Back to top
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1 md:flex-row md:justify-between">
        <p className="label !text-[12px] !text-ink/70">{BUILT_WITH}</p>
        <p className="label hidden !text-[12px] !text-ink/70 md:block">Try typing my handle.</p>
      </div>
    </footer>
  );
}
