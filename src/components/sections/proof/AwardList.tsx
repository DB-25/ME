"use client";

import type { Recognition } from "@/content";
import { assetUrl } from "@/lib/asset";
import { Scrim } from "../Scrim";
import { ProofThumb } from "./ProofThumb";

const LEGIBLE = "[text-shadow:0_0_24px_rgb(6_5_9/0.9),0_0_3px_rgb(6_5_9/0.5)]";

const CSS = `
.proof-row { transition: opacity 0.5s var(--ease-out-expo); }
.proof-arrow { transition: transform 0.5s var(--ease-out-expo), color 0.3s; }
@media (hover: hover) and (pointer: fine) {
  .proof-list:has(.proof-row:hover) .proof-row:not(:hover),
  .proof-list:has(.proof-row:focus-within) .proof-row:not(:focus-within) { opacity: 0.4; }
  .proof-row:hover .proof-arrow,
  .proof-row:focus-within .proof-arrow { transform: translate(4px, -4px); color: var(--color-ink); }
}
@media (prefers-reduced-motion: reduce) {
  .proof-row, .proof-arrow { transition: none !important; }
}
`;

function Copy({ item }: { item: Recognition }) {
  return (
    <>
      <h3 className={`text-[clamp(1.5rem,2.9vw,2.75rem)] font-medium leading-[1] tracking-[-0.04em] text-ink text-balance ${LEGIBLE}`}>
        {item.title}
      </h3>
      <p className="label mt-3 !text-[12px] !text-ink/80">{item.issuer}</p>
      {item.note && <p className={`mt-2 max-w-[34rem] text-[1rem] leading-[1.55] text-ink/85 ${LEGIBLE}`}>{item.note}</p>}
    </>
  );
}

/** Every row shows what it is, who gave it and why, without hover. Rows with a photo carry a visible thumbnail. */
function Row({ item }: { item: Recognition }) {
  const hasThumb = Boolean(item.image);
  const grid = "grid-12 items-start gap-y-3 py-5 md:py-6";
  const year = <p className="label num col-span-11 !text-[12px] !text-ink/75 md:col-span-1 md:pt-[0.9em]">{item.year}</p>;
  const copy = (
    <div className={`col-span-12 md:col-start-2 ${hasThumb ? "md:col-span-7" : "md:col-span-9"}`}>
      <Copy item={item} />
    </div>
  );

  const aside = item.image ? (
    <div className="col-span-12 md:col-span-3 md:col-start-10 md:row-start-1 md:justify-self-end md:self-start md:pt-1">
      <ProofThumb
        image={item.image}
        title={item.title}
        meta={`${item.issuer} · ${item.year}`}
        note={item.note}
        className="aspect-[16/10] w-full max-w-[11rem] md:max-w-[17rem]"
      />
    </div>
  ) : item.href ? (
    <span aria-hidden className="proof-arrow label col-span-1 col-start-12 row-start-1 justify-self-end !text-[14px] md:pt-[0.9em]">
      &#8599;
    </span>
  ) : null;

  // A photo row is never wrapped in a link: a link around a button is invalid and would swallow the lightbox.
  if (item.href && !item.image) {
    return (
      <li className="proof-row border-t border-hairline-strong">
        <a
          href={assetUrl(item.href)}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="read"
          aria-label={`${item.title}, ${item.issuer}, ${item.year} (opens in a new tab)`}
          className="block outline-none focus-visible:outline-offset-[-2px]"
        >
          <div className={grid}>
            {year}
            {copy}
            {aside}
          </div>
        </a>
      </li>
    );
  }
  return (
    <li className="proof-row border-t border-hairline-strong">
      <div className={grid}>
        {year}
        {copy}
        {aside}
      </div>
    </li>
  );
}

/** Oversized award titles, each with its issuer and reason on show. Hover or focus a row to bring it forward. */
export function AwardList({ items }: { items: Recognition[] }) {
  return (
    <div className="relative">
      <style>{CSS}</style>
      <Scrim shape="left" strength={0.88} inset="-4% -3% -4% -24px" />
      <p className="label mb-4 !text-[12px] !text-ink/75">Awards</p>
      <ul className="proof-list border-b border-hairline-strong">
        {items.map((item) => (
          <Row key={item.title} item={item} />
        ))}
      </ul>
    </div>
  );
}
