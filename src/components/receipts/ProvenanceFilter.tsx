"use client";

import type { Basis } from "@/content";
import { BASIS_ORDER } from "./ledger-state";

/** Dot colour per basis, the same four as the Impact tags. */
const DOT: Record<Basis, string> = {
  "third-party": "var(--color-accent-hot)",
  employer: "var(--color-accent)",
  self: "var(--color-saffron)",
  repo: "var(--color-dim)",
};

type Props = {
  active: Basis | null;
  counts: Record<Basis | "all", number>;
  onPick: (basis: Basis | null) => void;
  label: (basis: Basis) => string;
  meaning: (basis: Basis) => string;
};

/** The legend and the filter in one: each provenance tag, what it means, and how many rows carry it. */
export function ProvenanceFilter({ active, counts, onPick, label, meaning }: Props) {
  return (
    <div className="rc-legend" role="group" aria-label="Filter by who stands behind the claim">
      <button type="button" className="rc-chip" aria-pressed={active === null} onClick={() => onPick(null)}>
        <span className="rc-chip-head label">
          All claims
          <span className="num rc-chip-n">{counts.all}</span>
        </span>
        <span className="rc-chip-body">Every row, whoever stands behind it.</span>
      </button>
      {BASIS_ORDER.map((b) => (
        <button key={b} type="button" className="rc-chip" aria-pressed={active === b} onClick={() => onPick(active === b ? null : b)}>
          <span className="rc-chip-head label">
            <span aria-hidden className="rc-dot" style={{ background: DOT[b] }} />
            {label(b)}
            <span className="num rc-chip-n">{counts[b]}</span>
          </span>
          <span className="rc-chip-body">{meaning(b)}</span>
        </button>
      ))}
    </div>
  );
}
