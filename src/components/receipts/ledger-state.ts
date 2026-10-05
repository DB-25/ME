import type { Basis } from "@/content";
import type { LedgerRow } from "@/content/ledger";

/** Strongest backing first: someone else, then my employer, then a repo anyone can read, then my own word. */
export const BASIS_ORDER: Basis[] = ["third-party", "employer", "repo", "self"];

export const SITE_WIDE = "site";

export type SortId = "default" | "claim-asc" | "claim-desc" | "basis-asc" | "basis-desc" | "asof-desc" | "asof-asc";

export const SORT_LABEL: Record<SortId, string> = {
  default: "Site order",
  "claim-asc": "Claim, A to Z",
  "claim-desc": "Claim, Z to A",
  "basis-asc": "Best backed first",
  "basis-desc": "Self-reported first",
  "asof-desc": "Newest first",
  "asof-asc": "Oldest first",
};

export const SORT_IDS = Object.keys(SORT_LABEL) as SortId[];

/** A column header cycles through its two directions, then back to site order. */
export const COLUMN_SORT = {
  claim: ["claim-asc", "claim-desc"],
  basis: ["basis-asc", "basis-desc"],
  asOf: ["asof-desc", "asof-asc"],
} as const satisfies Record<string, readonly [SortId, SortId]>;

export type Column = keyof typeof COLUMN_SORT;

export function nextSort(current: SortId, column: Column): SortId {
  const [first, second] = COLUMN_SORT[column];
  if (current === first) return second;
  if (current === second) return "default";
  return first;
}

export function ariaSort(current: SortId, column: Column): "ascending" | "descending" | "none" {
  const [first, second] = COLUMN_SORT[column];
  if (current === first) return first.endsWith("desc") ? "descending" : "ascending";
  if (current === second) return second.endsWith("desc") ? "descending" : "ascending";
  return "none";
}

export type Filters = { basis: Basis | null; project: string | null };

export function applyFilters(rows: LedgerRow[], { basis, project }: Filters): LedgerRow[] {
  return rows.filter((r) => {
    if (basis && r.basis !== basis) return false;
    if (!project) return true;
    return project === SITE_WIDE ? r.projects.length === 0 : r.projects.includes(project);
  });
}

/** Sorts a copy. A row with no date always sits last, whichever way dates run. */
export function sortRows(rows: LedgerRow[], sort: SortId): LedgerRow[] {
  if (sort === "default") return rows;
  const out = [...rows];
  const byClaim = (a: LedgerRow, b: LedgerRow) => a.claim.localeCompare(b.claim, "en", { sensitivity: "base" });
  const byBasis = (a: LedgerRow, b: LedgerRow) => BASIS_ORDER.indexOf(a.basis) - BASIS_ORDER.indexOf(b.basis);
  switch (sort) {
    case "claim-asc":
      return out.sort(byClaim);
    case "claim-desc":
      return out.sort((a, b) => byClaim(b, a));
    case "basis-asc":
      return out.sort(byBasis);
    case "basis-desc":
      return out.sort((a, b) => byBasis(b, a));
    case "asof-desc":
    case "asof-asc": {
      const dir = sort === "asof-desc" ? -1 : 1;
      return out.sort((a, b) => {
        if (!a.asOf.sort || !b.asOf.sort) return a.asOf.sort === b.asOf.sort ? 0 : a.asOf.sort ? -1 : 1;
        return dir * a.asOf.sort.localeCompare(b.asOf.sort);
      });
    }
  }
}
