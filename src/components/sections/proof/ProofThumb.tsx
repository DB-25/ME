"use client";

import type { ReactNode } from "react";
import { assetUrl } from "@/lib/asset";
import { Lightbox, useLightbox, type LightboxImage } from "@/components/ui/Lightbox";

/**
 * A photo receipt that opens in place. The affordance is always on screen (no hover needed): an opaque
 * "View photo" chip on the image, and a border that lights up on hover and keyboard focus.
 */
export function ProofThumb({
  image,
  title,
  meta,
  note,
  className = "",
}: {
  image: LightboxImage;
  title: string;
  meta?: ReactNode;
  note?: string;
  className?: string;
}) {
  const lb = useLightbox();
  return (
    <>
      <button
        type="button"
        onClick={lb.open}
        data-cursor="view"
        aria-label={`View photo: ${title}`}
        aria-haspopup="dialog"
        className={`group/pt relative block min-h-11 overflow-hidden rounded-[3px] border border-ink/30 text-left transition-colors duration-300 hover:border-accent-hot focus-visible:border-accent-hot ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
        <img
          src={assetUrl(image.src)}
          alt=""
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-cover object-[50%_26%] transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/pt:scale-[1.04]"
        />
        <span className="label absolute bottom-0 left-0 inline-flex items-center gap-2 bg-void px-3 py-2 !text-[12px] !text-ink transition-colors duration-300 group-hover/pt:!text-accent-hot group-focus-visible/pt:!text-accent-hot">
          View photo
          <span aria-hidden>+</span>
        </span>
      </button>
      <Lightbox image={image} title={title} meta={meta} note={note} controller={lb} />
    </>
  );
}
