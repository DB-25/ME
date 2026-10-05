"use client";

import "./receipts.css";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { BASIS, type Basis } from "@/content";
import type { LedgerRow } from "@/content/ledger";
import { LedgerTable } from "./LedgerTable";
import { ProvenanceFilter } from "./ProvenanceFilter";
import { applyFilters, BASIS_ORDER, SITE_WIDE, SORT_IDS, SORT_LABEL, sortRows, type SortId } from "./ledger-state";

type ProjectOption = { slug: string; name: string };

const isBasis = (v: string | null): v is Basis => BASIS_ORDER.includes(v as Basis);
const isSort = (v: string | null): v is SortId => SORT_IDS.includes(v as SortId);

/*
 * The filter and sort choice lives in the query string, so a link such as /receipts/?project=genie opens already
 * narrowed and a filtered view can be shared. The URL is the one source of truth: it is read through a tiny external
 * store (empty on the server, so the first paint matches the static HTML), and a change rewrites it and notifies.
 */
const CHANGE_EVENT = "receipts:query";
const subscribe = (notify: () => void) => {
  window.addEventListener(CHANGE_EVENT, notify);
  window.addEventListener("popstate", notify);
  return () => {
    window.removeEventListener(CHANGE_EVENT, notify);
    window.removeEventListener("popstate", notify);
  };
};
const readSearch = () => window.location.search;
const readServerSearch = () => "";

function writeUrl(basis: Basis | null, project: string | null, sort: SortId) {
  const q = new URLSearchParams();
  if (basis) q.set("basis", basis);
  if (project) q.set("project", project);
  if (sort !== "default") q.set("sort", sort);
  const qs = q.toString();
  window.history.replaceState(window.history.state, "", `${window.location.pathname}${qs ? `?${qs}` : ""}${window.location.hash}`);
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function Ledger({ rows, projects }: { rows: LedgerRow[]; projects: ProjectOption[] }) {
  const search = useSyncExternalStore(subscribe, readSearch, readServerSearch);
  const { basis, project, sort } = useMemo(() => {
    const q = new URLSearchParams(search);
    const b = q.get("basis");
    const p = q.get("project");
    const s = q.get("sort");
    return {
      basis: isBasis(b) ? b : null,
      project: p && (p === SITE_WIDE || projects.some((o) => o.slug === p)) ? p : null,
      sort: isSort(s) ? s : ("default" as SortId),
    };
  }, [search, projects]);

  // A link that carries a hash lands on its row once the table exists.
  useEffect(() => {
    const hash = decodeURIComponent(window.location.hash.slice(1));
    if (hash) requestAnimationFrame(() => document.getElementById(hash)?.scrollIntoView());
  }, []);

  const change = (next: { basis?: Basis | null; project?: string | null; sort?: SortId }) =>
    writeUrl(next.basis === undefined ? basis : next.basis, next.project === undefined ? project : next.project, next.sort ?? sort);

  // Counts per provenance reflect the project filter, so the chips never promise rows that are not there.
  const countsBase = useMemo(() => applyFilters(rows, { basis: null, project }), [rows, project]);
  const counts = useMemo(() => {
    const out = { all: countsBase.length } as Record<Basis | "all", number>;
    for (const b of BASIS_ORDER) out[b] = countsBase.filter((r) => r.basis === b).length;
    return out;
  }, [countsBase]);

  const shown = useMemo(() => sortRows(applyFilters(rows, { basis, project }), sort), [rows, basis, project, sort]);
  const filtered = basis !== null || project !== null;
  const siteWideCount = rows.filter((r) => r.projects.length === 0).length;
  const projectName = project === SITE_WIDE ? "site-wide" : projects.find((p) => p.slug === project)?.name;

  return (
    <div className="rc">
      <ProvenanceFilter active={basis} counts={counts} onPick={(b) => change({ basis: b })} meaning={(b) => BASIS[b].meaning} label={(b) => BASIS[b].label} />

      <div className="rc-controls">
        <label className="rc-field">
          <span className="label">Project</span>
          <select value={project ?? ""} onChange={(e) => change({ project: e.target.value || null })} className="rc-select">
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name}
              </option>
            ))}
            <option value={SITE_WIDE}>{`Site-wide and profile (${siteWideCount})`}</option>
          </select>
        </label>
        <label className="rc-field">
          <span className="label">Sort</span>
          <select value={sort} onChange={(e) => change({ sort: e.target.value as SortId })} className="rc-select">
            {SORT_IDS.map((id) => (
              <option key={id} value={id}>
                {SORT_LABEL[id]}
              </option>
            ))}
          </select>
        </label>
        <p className="rc-status label" role="status" aria-live="polite">
          {shown.length} of {rows.length} receipts
          {filtered ? (
            <button type="button" className="rc-clear label" onClick={() => change({ basis: null, project: null })}>
              Clear filters
            </button>
          ) : null}
        </p>
      </div>

      {shown.length ? (
        <LedgerTable rows={shown} sort={sort} onSort={(s) => change({ sort: s })} />
      ) : (
        <div className="rc-empty">
          <p>
            No receipts match{projectName ? ` ${projectName}` : ""}
            {basis ? ` with ${BASIS[basis].label.toLowerCase()} backing` : ""}.
          </p>
          <button type="button" className="rc-clear label" onClick={() => change({ basis: null, project: null })}>
            Clear filters
          </button>
        </div>
      )}
    </div>
  );
}
