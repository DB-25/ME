"use client";

import { useEffect, useState } from "react";
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
    <p className="label">
      Boston <span className="num inline-block min-w-[9ch] text-ink">{now || "--:-- ---"}</span>
    </p>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline py-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
        <p className="label">&copy; 2026 Dhruv Kamalesh Kumar</p>
        <BostonClock />
        <button type="button" onClick={() => scrollToTarget("#hero")} className="label link w-fit text-left hover:!text-ink">
          Back to top
        </button>
      </div>
      <div className="mt-3 flex flex-col gap-1 md:flex-row md:justify-between">
        <p className="label !text-dim">{BUILT_WITH}</p>
        <p className="label hidden !text-dim md:block">Try typing my handle.</p>
      </div>
    </footer>
  );
}
