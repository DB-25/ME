"use client";

import Link from "next/link";
import { useState } from "react";
import type { LedgerRow } from "@/content/ledger";
import { assetUrl } from "@/lib/asset";
import { BasisTag } from "@/components/sections/impact/BasisTag";
import { ariaSort, nextSort, type Column, type SortId } from "./ledger-state";

/** Longer than this and a definition is clamped to a few lines with a "More" toggle. */
const CLAMP_AT = 190;

const COLUMNS: { key: Column | null; label: string }[] = [
  { key: "claim", label: "Claim" },
  { key: null, label: "What it counts" },
  { key: null, label: "Where it appears" },
  { key: "basis", label: "Who says so" },
  { key: null, label: "Source" },
  { key: "asOf", label: "As of" },
];

function Definition({ id, text }: { id: string; text: string }) {
  const [open, setOpen] = useState(false);
  const long = text.length > CLAMP_AT;
  return (
    <>
      <p id={`${id}-def`} className="rc-def" data-clamped={long && !open ? "" : undefined}>
        {text}
      </p>
      {long ? (
        <button type="button" className="rc-more label" aria-expanded={open} aria-controls={`${id}-def`} onClick={() => setOpen((v) => !v)}>
          {open ? "Less" : "More"}
        </button>
      ) : null}
    </>
  );
}

function Source({ row }: { row: LedgerRow }) {
  const { source } = row;
  if (!source.href) return <span className="rc-private label">{source.label}</span>;
  return (
    <a href={assetUrl(source.href)} target="_blank" rel="noopener noreferrer" data-cursor="read" className="rc-link label" aria-label={`${source.label}, source for ${row.claim} (opens in a new tab)`}>
      <span className="rc-underline">
        {source.label.split(/(?<=\.)/).map((part, i) => (
          <span key={i}>
            {i > 0 ? <wbr /> : null}
            {part}
          </span>
        ))}
      </span>
      <span aria-hidden>&#8599;</span>
    </a>
  );
}

function Row({ row }: { row: LedgerRow }) {
  const isFigure = /\d/.test(row.value);
  return (
    <tr id={row.id} className="rc-row" role="row">
      <th scope="row" role="rowheader" className="rc-claim" data-area="claim">
        <span className={isFigure ? "rc-val num" : "rc-val rc-val-text label"}>{row.value}</span>
        <span className="rc-claim-text">{row.claim}</span>
      </th>
      <td role="cell" data-area="def">
        <Definition id={row.id} text={row.definition} />
      </td>
      <td role="cell" data-area="where" data-label="Where it appears">
        <ul className="rc-where">
          {row.appears.map((a) => (
            <li key={a.href}>
              <Link href={a.href} prefetch={false} className="rc-link label" data-cursor="open">
                <span className="rc-underline">{a.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </td>
      <td role="cell" data-area="basis" data-label="Who says so">
        <BasisTag metric={{ source: "", basis: row.basis }} />
      </td>
      <td role="cell" data-area="source" data-label="Source">
        <Source row={row} />
      </td>
      <td role="cell" data-area="asof" data-label="As of">
        <span className={row.asOf.sort ? "rc-date label num" : "rc-date rc-undated label"}>{row.asOf.label}</span>
      </td>
    </tr>
  );
}

export function LedgerTable({ rows, sort, onSort }: { rows: LedgerRow[]; sort: SortId; onSort: (s: SortId) => void }) {
  return (
    <table className="rc-table" role="table" aria-label="Claims ledger">
      <colgroup>
        <col className="rc-c-claim" />
        <col className="rc-c-def" />
        <col className="rc-c-where" />
        <col className="rc-c-basis" />
        <col className="rc-c-source" />
        <col className="rc-c-asof" />
      </colgroup>
      <thead className="rc-head" role="rowgroup">
        <tr role="row">
          {COLUMNS.map((c) => (
            <th key={c.label} scope="col" role="columnheader" aria-sort={c.key ? ariaSort(sort, c.key) : undefined}>
              {c.key ? (
                <button type="button" className="rc-sort label" onClick={() => onSort(nextSort(sort, c.key!))}>
                  {c.label}
                  <span aria-hidden className="rc-arrow" data-on={ariaSort(sort, c.key) !== "none" ? "" : undefined}>
                    {ariaSort(sort, c.key) === "descending" ? "↓" : ariaSort(sort, c.key) === "ascending" ? "↑" : "↕"}
                  </span>
                </button>
              ) : (
                <span className="label">{c.label}</span>
              )}
            </th>
          ))}
        </tr>
      </thead>
      <tbody role="rowgroup">
        {rows.map((r) => (
          <Row key={r.id} row={r} />
        ))}
      </tbody>
    </table>
  );
}
