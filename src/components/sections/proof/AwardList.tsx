import type { Recognition } from "@/content";

const LEGIBLE = "[text-shadow:0_0_24px_rgb(6_5_9/0.9),0_0_3px_rgb(6_5_9/0.5)]";

const CSS = `
.proof-detail { display: grid; grid-template-rows: 1fr; opacity: 1; }
.proof-detail > div { min-height: 0; overflow: hidden; }
.proof-row { transition: opacity 0.5s var(--ease-out-expo); }
.proof-arrow { transition: transform 0.5s var(--ease-out-expo), color 0.3s; }
@media (hover: hover) and (pointer: fine) {
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
    <div className="grid-12 items-start gap-y-3 py-6 md:py-8">
      <p className="label num col-span-3 pt-[0.6em] md:col-span-1 md:pt-[1.1em]">{item.year}</p>
      <div className="col-span-12 md:col-span-10 md:col-start-2">
        <h3 className={`text-[clamp(1.75rem,4.4vw,4.4rem)] font-medium leading-[0.98] tracking-[-0.04em] text-ink text-balance ${LEGIBLE}`}>
          {item.title}
        </h3>
        <div className="proof-detail">
          <div>
            <div className="grid-12 pt-5 md:pt-6">
              <p className="label col-span-12 !text-ink md:col-span-4">{item.issuer}</p>
              {item.note && (
                <p className={`col-span-12 mt-3 max-w-[34rem] text-[1rem] leading-[1.55] text-ink/75 md:col-span-6 md:mt-0 ${LEGIBLE}`}>
                  {item.note}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
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
          href={item.href}
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
    <div>
      <style>{CSS}</style>
      <p className="label mb-6">Awards</p>
      <ul className="proof-list border-b border-hairline-strong">
        {items.map((item) => (
          <Row key={item.title} item={item} />
        ))}
      </ul>
    </div>
  );
}
