"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap, EASE_OUT } from "@/lib/motion";

export type PreviewItem = { slug: string; name: string; src?: string; alt: string };

const LERP = 0.14;
const EDGE = 24;
const ROW_PAD = 10;
const SHELL_MAX = 1440;
const SHOW = "inset(0% 0% 0% 0%)";
const FROM_BELOW = "inset(100% 0% 0% 0%)";
const TO_ABOVE = "inset(0% 0% 100% 0%)";

/** How far the "developing" tint has cleared on a layer: 0 is the resting ultraviolet cast, 1 is natural. */
const DEVELOPED = 0.8;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * A dark-framed still that sits in the right gutter beside the hovered title (never over it).
 * Only its vertical position follows the cursor, lerped in a gsap ticker and clamped to the
 * hovered row. Each project's image wipes in tinted ultraviolet and develops while you dwell.
 * Mount only when `useDesktopHover()` is true.
 */
export function CursorPreview({ items, activeSlug }: { items: PreviewItem[]; activeSlug: string | null }) {
  // Only mounted after hydration (see FeaturedIndex), so document is always available.
  const host = typeof document === "undefined" ? null : document.body;
  const box = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<string, HTMLDivElement>());
  const state = useRef({ ty: -999, y: -999, x: 0, shown: false, z: 1, slug: null as string | null, cy: 0 });

  // Pointer tracking and the lerp loop.
  useEffect(() => {
    const el = box.current;
    if (!host || !el) return;
    const s = state.current;
    gsap.set(el, { yPercent: -50, x: 0, y: -999, autoAlpha: 0, clipPath: FROM_BELOW });
    const setX = gsap.quickSetter(el, "x", "px");
    const setY = gsap.quickSetter(el, "y", "px");

    /** Park the frame in the right gutter and keep it inside the hovered row. */
    const target = () => {
      const w = el.offsetWidth;
      const h = el.offsetHeight;
      const vw = window.innerWidth;
      const right = (vw + Math.min(vw, SHELL_MAX)) / 2 - EDGE;
      s.x = right - w;
      const row = s.slug ? document.querySelector<HTMLElement>(`.wk-row[data-slug="${s.slug}"]`) : null;
      if (!row) return;
      const r = row.getBoundingClientRect();
      const lo = r.top + h / 2 + ROW_PAD;
      const hi = r.bottom - h / 2 - ROW_PAD;
      s.ty = hi > lo ? clamp(s.cy, lo, hi) : (r.top + r.bottom) / 2;
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      s.cy = e.clientY;
      target();
    };
    const tick = () => {
      if (!s.shown) return;
      target();
      s.y += (s.ty - s.y) * LERP;
      setX(s.x);
      setY(s.y);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    gsap.ticker.add(tick);
    return () => {
      window.removeEventListener("pointermove", onMove);
      gsap.ticker.remove(tick);
      gsap.killTweensOf(el);
    };
  }, [host]);

  // Show, swap and hide as the hovered row changes.
  useEffect(() => {
    const el = box.current;
    if (!host || !el) return;
    const s = state.current;
    s.slug = activeSlug;
    if (!activeSlug) {
      if (!s.shown) return;
      s.shown = false;
      gsap.to(el, { clipPath: TO_ABOVE, duration: 0.55, ease: "expo.inOut", overwrite: true, onComplete: () => void gsap.set(el, { autoAlpha: 0 }) });
      return;
    }
    const layer = layers.current.get(activeSlug);
    if (!layer) return;
    const inner = layer.firstElementChild as HTMLElement | null;
    layer.style.zIndex = String(++s.z);
    gsap.fromTo(layer, { clipPath: FROM_BELOW, "--dev": 0 }, { clipPath: SHOW, duration: 0.9, ease: EASE_OUT });
    gsap.to(layer, { "--dev": DEVELOPED, duration: 1.6, ease: "power2.out", delay: 0.3, overwrite: "auto" });
    if (inner) gsap.fromTo(inner, { scale: 1.3 }, { scale: 1, duration: 1.2, ease: EASE_OUT });
    if (!s.shown) {
      s.shown = true;
      const row = document.querySelector<HTMLElement>(`.wk-row[data-slug="${activeSlug}"]`);
      if (row) {
        const r = row.getBoundingClientRect();
        s.cy = clamp(s.cy || (r.top + r.bottom) / 2, r.top, r.bottom);
      }
      const w = el.offsetWidth;
      const vw = window.innerWidth;
      s.x = (vw + Math.min(vw, SHELL_MAX)) / 2 - EDGE - w;
      s.ty = s.cy;
      s.y = s.cy;
      gsap.set(el, { x: s.x, y: s.y, autoAlpha: 1 });
      gsap.fromTo(el, { clipPath: FROM_BELOW }, { clipPath: SHOW, duration: 0.8, ease: EASE_OUT, overwrite: true });
    }
  }, [activeSlug, host]);

  if (!host) return null;
  return createPortal(
    <div ref={box} aria-hidden className="wk-preview" style={{ visibility: "hidden" }}>
      <div className="wk-preview-stage">
        {items.map((it) => (
          <div
            key={it.slug}
            ref={(n) => {
              if (n) layers.current.set(it.slug, n);
              else layers.current.delete(it.slug);
            }}
            className="wk-preview-layer"
            style={{ clipPath: FROM_BELOW }}
          >
            {it.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={it.src} alt="" decoding="async" draggable={false} />
            ) : (
              <div className="wk-preview-type">
                <span>{it.name}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>,
    host,
  );
}
