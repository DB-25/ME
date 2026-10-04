"use client";

import { useState } from "react";
import type { Recognition } from "@/content";
import { assetUrl } from "@/lib/asset";
import { ScrollTrigger } from "@/lib/motion";
import { EvidenceThumb } from "@/components/ui/Lightbox";
import { Scrim } from "../Scrim";

const KIND_LABEL: Record<Recognition["kind"], string> = { award: "Award", press: "Press", talk: "Talk" };
/** Entries visible before the disclosure. The rest are one click away, never removed. */
const VISIBLE = 5;

function Entry({ r }: { r: Recognition }) {
  const row = (
    <div className="grid-12 gap-y-2 py-4 md:py-5 [text-shadow:0_0_12px_rgb(6_5_9/1),0_0_28px_rgb(6_5_9/0.9)]">
      <p className="label num col-span-3 !text-[12px] !text-ink/75 md:col-span-1">{r.year}</p>
      <p className="label col-span-9 !text-[12px] !text-ink md:col-span-3">
        {r.issuer}
        <span className="ml-3 !text-ink/65">{KIND_LABEL[r.kind]}</span>
      </p>
      <div className="col-span-12 md:col-span-7">
        <p className="group-hover:text-accent-hot group-focus-visible:text-accent-hot text-[clamp(1.0625rem,1.5vw,1.375rem)] leading-[1.3] tracking-[-0.02em] text-ink transition-colors duration-300">{r.title}</p>
        {r.note && <p className="mt-2 max-w-[34rem] text-[1rem] leading-[1.5] text-ink/85">{r.note}</p>}
        {r.image && (
          <EvidenceThumb
            image={r.image}
            title={r.title}
            meta={`${r.issuer} · ${r.year}`}
            note={r.note}
            className="mt-3 aspect-[16/10] w-full max-w-[9rem] md:max-w-[16rem] [text-shadow:none] [&_img]:object-[50%_26%]"
          />
        )}
      </div>
      {r.href && (
        <span aria-hidden className="label col-span-1 hidden justify-self-end !text-[14px] md:block">
          &#8599;
        </span>
      )}
    </div>
  );
  return (
    <li className="border-t border-hairline">
      {r.href ? (
        <a href={assetUrl(r.href)} target="_blank" rel="noopener noreferrer" data-cursor="read" className="group block">
          {row}
        </a>
      ) : (
        row
      )}
    </li>
  );
}

/** The press and talk record as a plain, linked ledger: the top few, then a disclosure for the rest. */
export function PressIndex({ items }: { items: Recognition[] }) {
  const [open, setOpen] = useState(false);
  const head = items.slice(0, VISIBLE);
  const rest = items.slice(VISIBLE);

  return (
    <div className="relative mt-[clamp(32px,4vw,56px)]">
      <Scrim shape="band" strength={0.9} inset="-3% -3% -3% -24px" />
      <p className="label mb-4 !text-[12px] !text-ink/75">Press and talks</p>
      <ul className="border-b border-hairline">
        {head.map((r) => (
          <Entry key={r.title} r={r} />
        ))}
      </ul>
      {rest.length > 0 && (
        <>
          <ul id="press-more" hidden={!open} className="border-b border-hairline">
            {rest.map((r) => (
              <Entry key={r.title} r={r} />
            ))}
          </ul>
          <button
            type="button"
            aria-expanded={open}
            aria-controls="press-more"
            onClick={() => {
              setOpen((v) => !v);
              requestAnimationFrame(() => ScrollTrigger.refresh());
            }}
            className="label mt-5 inline-flex items-center gap-3 border border-hairline-strong px-5 py-3 !text-[12px] !text-ink transition-colors duration-300 hover:border-accent hover:!text-accent-hot"
          >
            {open ? "Show fewer" : `Show all ${items.length}`}
            <span aria-hidden>{open ? "−" : "+"}</span>
          </button>
        </>
      )}
    </div>
  );
}
