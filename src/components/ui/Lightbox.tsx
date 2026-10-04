"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { assetUrl } from "@/lib/asset";
import { prefersReducedMotion } from "@/lib/motion";

export type LightboxImage = { src: string; alt: string; width: number; height: number };

type LenisLike = { stop: () => void; start: () => void };
const lenis = () => (window as unknown as { lenis?: LenisLike }).lenis;

const CLOSE_MS = 280;

const CSS = `
.lb { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0;
  border: 0; background: transparent; color: var(--color-ink); overflow: hidden; }
.lb::backdrop { background: rgb(6 5 9 / 0.88); backdrop-filter: blur(10px); opacity: 0; transition: opacity ${CLOSE_MS}ms var(--ease-out-expo); }
.lb[open]::backdrop { opacity: 1; }
.lb-stage { position: absolute; inset: 0; display: grid; grid-template-rows: minmax(0, 1fr) auto; gap: 20px;
  padding: max(24px, env(safe-area-inset-top)) var(--gutter) max(24px, env(safe-area-inset-bottom)); }
.lb-figure { min-height: 0; height: 100%; display: flex; align-items: center; justify-content: center; margin: 0; overflow: hidden; }
.lb-img { max-width: 100%; max-height: 100%; width: auto; height: auto; min-height: 0; object-fit: contain; border-radius: 3px;
  box-shadow: 0 30px 120px -30px rgb(139 123 255 / 0.35), 0 0 0 1px var(--color-hairline);
  opacity: 0; transform: scale(0.96) translateY(8px);
  transition: opacity 600ms var(--ease-out-expo), transform 800ms var(--ease-out-expo); }
.lb[data-state="open"] .lb-img { opacity: 1; transform: none; }
.lb-cap { display: grid; grid-template-columns: 1fr auto; gap: 8px 24px; align-items: end; max-width: var(--maxw); width: 100%; margin: 0 auto;
  opacity: 0; transform: translateY(8px); transition: opacity 600ms 120ms var(--ease-out-expo), transform 700ms 120ms var(--ease-out-expo); }
.lb[data-state="open"] .lb-cap { opacity: 1; transform: none; }
.lb[data-state="closing"] .lb-img, .lb[data-state="closing"] .lb-cap { opacity: 0; transition-duration: ${CLOSE_MS}ms; transition-delay: 0ms; }
.lb-title { font-size: clamp(1.25rem, 2.2vw, 1.75rem); letter-spacing: -0.03em; line-height: 1.1; font-weight: 500; }
.lb-close { justify-self: end; color: var(--color-ink); border: 1px solid var(--color-hairline-strong); border-radius: 2px;
  padding: 10px 14px; min-height: 44px; background: rgb(6 5 9 / 0.6); transition: border-color .25s, color .25s; }
.lb-close:hover { border-color: var(--color-accent); color: var(--color-accent-hot); }
@media (hover: none) { .lb-esc { display: none; } }
@media (prefers-reduced-motion: reduce) { .lb *, .lb::backdrop { transition: none !important; } }
`;

/**
 * Opens a piece of local evidence (a photo, a certificate) in place, over the page, instead of
 * navigating to a bare image. Native <dialog> gives focus trapping, Esc and an inert page for free;
 * Lenis is paused while open and focus returns to the trigger on close.
 */
export function useLightbox() {
  const ref = useRef<HTMLDialogElement>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");

  const open = useCallback(() => {
    const el = ref.current;
    if (!el || el.open) return;
    el.showModal();
    lenis()?.stop();
    requestAnimationFrame(() => setState("open"));
  }, []);

  const close = useCallback(() => {
    const el = ref.current;
    if (!el || !el.open) return;
    const finish = () => {
      el.close();
      setState("closed");
      lenis()?.start();
    };
    if (prefersReducedMotion()) return finish();
    setState("closing");
    window.setTimeout(finish, CLOSE_MS);
  }, []);

  return { ref, state, open, close };
}

export function Lightbox({
  image,
  title,
  meta,
  note,
  controller,
}: {
  image: LightboxImage;
  title: string;
  meta?: ReactNode;
  note?: string;
  controller: ReturnType<typeof useLightbox>;
}) {
  const { ref, state, close } = controller;
  const titleId = useId();

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Esc fires `cancel`: animate out instead of the native instant close.
    const onCancel = (e: Event) => {
      e.preventDefault();
      close();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [ref, close]);

  return (
    <dialog
      ref={ref}
      className="lb"
      data-state={state}
      aria-labelledby={titleId}
      onClick={(e) => {
        // A click on the stage (not the image or caption controls) closes.
        if (e.target === e.currentTarget || (e.target as HTMLElement).classList.contains("lb-figure")) close();
      }}
    >
      <style>{CSS}</style>
      <div className="lb-stage">
        <figure className="lb-figure">
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, already sized */}
          <img
            className="lb-img"
            src={state === "closed" ? undefined : assetUrl(image.src)}
            alt={image.alt}
            width={image.width}
            height={image.height}
            decoding="async"
          />
        </figure>
        <div className="lb-cap">
          <div>
            {meta && <p className="label mb-2">{meta}</p>}
            <p id={titleId} className="lb-title">
              {title}
            </p>
            {note && <p className="mt-2 max-w-[44rem] text-[0.9375rem] leading-[1.5] text-muted">{note}</p>}
          </div>
          <button type="button" className="label lb-close" onClick={close} autoFocus>
            Close <span aria-hidden className="lb-esc">Esc</span>
          </button>
        </div>
      </div>
    </dialog>
  );
}

/**
 * An inline evidence thumbnail that opens the full image in place. The thumbnail is the button:
 * its accessible name says what opens.
 */
export function EvidenceThumb({
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
        className={`ev-thumb group/ev relative block overflow-hidden rounded-[3px] border border-ink/30 transition-colors duration-300 hover:border-accent-hot focus-visible:border-accent-hot ${className}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- static export */}
        <img
          src={assetUrl(image.src)}
          alt=""
          width={image.width}
          height={image.height}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-cover transition-transform duration-700 ease-[var(--ease-out-expo)] group-hover/ev:scale-[1.04]"
        />
        <span className="label absolute bottom-0 left-0 inline-flex items-center gap-2 bg-void px-3 py-2 !text-[12px] !text-ink transition-colors duration-300 group-hover/ev:!text-accent-hot group-focus-visible/ev:!text-accent-hot">
          View photo <span aria-hidden>+</span>
        </span>
      </button>
      <Lightbox image={image} title={title} meta={meta} note={note} controller={lb} />
    </>
  );
}
