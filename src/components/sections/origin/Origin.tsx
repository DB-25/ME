"use client";

import "../fade.css";
import { usePinnedMode } from "./usePinnedMode";
import { PinnedJourney } from "./PinnedJourney";
import { StaticJourney } from "./StaticJourney";

/** 03 / Origin. Bangalore to Boston, one beat per scroll step. */
export function Origin() {
  const pinned = usePinnedMode();
  return (
    <section id="origin" data-chapter="origin" aria-labelledby="origin-title" className="sx-in relative">
      <div className="sx-out">{pinned ? <PinnedJourney /> : <StaticJourney />}</div>
    </section>
  );
}
