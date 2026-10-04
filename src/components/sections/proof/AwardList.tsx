"use client";

import type { Recognition } from "@/content";
import { assetUrl } from "@/lib/asset";
import { EvidenceThumb } from "@/components/ui/Lightbox";
import { Scrim } from "../Scrim";

const LEGIBLE = "[text-shadow:0_0_24px_rgb(6_5_9/0.9),0_0_3px_rgb(6_5_9/0.5)]";

const CSS = `
.proof-detail { display: grid; grid-template-rows: 1fr; opacity: 1; }
.proof-detail > div { min-height: 0; overflow: hidden; }
.proof-row { transition: opacity 0.5s var(--ease-out-expo); }
.proof-hint { display: none; }
.proof-arrow { transition: transform 0.5s var(--ease-out-expo), color 0.3s; }
@media (hover: hover) and (pointer: fine) {
  .proof-hint { display: inline-flex; transition: opacity 0.4s var(--ease-out-expo); }
  .proof-row:hover .proof-hint,
  .proof-row:focus-within .proof-hint { opacity: 0; }
  .proof-detail {
    grid-template-rows: 0fr;
    opacity: 0;
    transition: grid-template-rows 0.8s var(--ease-out-expo), opacity 0.5s var(--ease-out-expo);
  }
  .proof-row:hover .proof-detail,
  .proof-row:focus-within .proof-detail { grid-template-rows: 1fr; opacity: 1; }
  .proof-list:has(.proof-row:hover) .proof-row:not(:hover),
  .proof-list:has(.proof-row:focus-within) .proof-row:not(:focus-within) { opacity: 0.32; }
  .proof-row:hover .proof-arrow,
  .proof-row:focus-within .proof-arrow { transform: translate(4px, -4px); color: var(--color-ink); }
}
@media (prefers-reduced-motion: reduce) {
  .proof-detail, .proof-row, .proof-arrow { transition: none !important; }
}
`;

function Row({ item }: { item: Recognition }) {
  const body = (
    <div className="grid-12 items-start gap-y-3 py-4 md:py-5">
      <p className="label num col-span-3 pt-[0.6em] !text-[12px] !text-ink/75 md:col-span-1 md:pt-[1.1em]">{item.year}</p>
      <div className="col-span-12 md:col-span-8 md:col-start-2">
        <h3 className={`text-[clamp(1.5rem,3.2vw,3rem)] font-medium leading-[0.98] tracking-[-0.04em] text-ink text-balance ${LEGIBLE}`}>
          {item.title}
        </h3>
        <div className="proof-detail">
          <div>
            <div className="grid-12 pt-3 md:pt-4">
              <p className="label col-span-12 !text-[12px] !text-ink md:col-span-4">{item.issuer}</p>
              {item.note && (
                <p className={`col-span-12 mt-3 max-w-[34rem] text-[1rem] leading-[1.55] text-ink/85 md:col-span-8 md:mt-0 ${LEGIBLE}`}>
                  {item.note}
                </p>
              )}
              {item.image && (
                <EvidenceThumb
                  image={item.image}
                  title={item.title}
                  meta={`${item.issuer} · ${item.year}`}
                  note={item.note}
                  className="col-span-12 mt-3 aspect-[16/10] w-full max-w-[9rem] md:mt-5 md:max-w-[22rem] md:col-span-6 md:col-start-5 [&_img]:object-[50%_26%]"
                />
              )}
            </div>
          </div>
        </div>
      </div>
      {item.image && (
        <span aria-hidden className="proof-hint col-span-2 col-start-10 row-start-1 items-center gap-2 justify-self-end pt-[0.6em] md:pt-[1.1em]">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, tiny decorative thumb */}
          <img src={assetUrl(item.image.src)} alt="" width={36} height={24} loading="lazy" decoding="async" className="h-6 w-9 rounded-[2px] border border-hairline-strong object-cover object-[50%_30%]" />
          <span className="label !text-[12px] !text-ink/80">Photo</span>
        </span>
      )}
      {item.href && (
        <span aria-hidden className="proof-arrow label col-span-1 col-start-12 row-start-1 justify-self-end pt-[0.6em] !text-[14px] md:pt-[1.1em]">
          &#8599;
        </span>
      )}
    </div>
  );

  return (
    <li className="proof-row border-t border-hairline-strong">
      {item.href ? (
        <a
          href={assetUrl(item.href)}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="read"
          className="block outline-none focus-visible:outline-offset-[-2px]"
        >
          {body}
        </a>
      ) : (
        body
      )}
    </li>
  );
}

/** Oversized award titles. Hover or focus a row and it opens to show who gave it and why. */
export function AwardList({ items }: { items: Recognition[] }) {
  return (
    <div className="relative">
      <style>{CSS}</style>
      <Scrim shape="left" strength={0.85} inset="-4% -3% -4% -24px" />
      <p className="label mb-4 !text-[12px] !text-ink/75">Awards</p>
      <ul className="proof-list border-b border-hairline-strong">
        {items.map((item) => (
          <Row key={item.title} item={item} />
        ))}
      </ul>
    </div>
  );
}
