"use client";

import { usePinnedMode } from "./usePinnedMode";
import { PinnedJourney } from "./PinnedJourney";
import { StaticJourney } from "./StaticJourney";

/** 01 / Origin. Bangalore to Boston, one beat per scroll step. */
export function Origin() {
  const pinned = usePinnedMode();
  return (
    <section id="origin" data-chapter="origin" aria-labelledby="origin-title" className="relative">
      {pinned ? <PinnedJourney /> : <StaticJourney />}
    </section>
  );
}
