"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { gsap, EASE_OUT } from "@/lib/motion";

export type PreviewItem = { slug: string; name: string; accent: string; src?: string; alt: string };

const LERP = 0.14;
const OFFSET_X = 210;
const EDGE = 20;
const MAX_SKEW = 9;
const SKEW_GAIN = 0.9;
const SHOW = "inset(0% 0% 0% 0%)";
const FROM_BELOW = "inset(100% 0% 0% 0%)";
const TO_ABOVE = "inset(0% 0% 100% 0%)";

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Media that trails the cursor. Position is lerped in a gsap ticker, skew comes from
 * cursor velocity, and each project's image is revealed with a clip-path wipe.
 * Mount only when `useDesktopHover()` is true.
 */
export function CursorPreview({ items, activeSlug }: { items: PreviewItem[]; activeSlug: string | null }) {
  // Only mounted after hydration (see FeaturedIndex), so document is always available.
  const host = typeof document === "undefined" ? null : document.body;
  const box = useRef<HTMLDivElement>(null);
  const layers = useRef(new Map<string, HTMLDivElement>());
  const state = useRef({ tx: -999, ty: -999, x: -999, y: -999, skew: 0, shown: false, z: 1 });

  // Pointer tracking and the lerp loop.
  useEffect(() => {
    const el = box.current;
    if (!host || !el) return;
    const s = state.current;
    gsap.set(el, { xPercent: -50, yPercent: -50, x: -999, y: -999, autoAlpha: 0, clipPath: FROM_BELOW });
    const setX = gsap.quickSetter(el, "x", "px");
    const setY = gsap.quickSetter(el, "y", "px");
    const setSkew = gsap.quickSetter(el, "skewX", "deg");
    const setRot = gsap.quickSetter(el, "rotation", "deg");

    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      const half = el.offsetWidth / 2;
      s.tx = clamp(e.clientX + OFFSET_X, half + EDGE, window.innerWidth - half - EDGE);
      s.ty = clamp(e.clientY, el.offsetHeight / 2 + EDGE, window.innerHeight - el.offsetHeight / 2 - EDGE);
    };
    const tick = () => {
      if (!s.shown) return;
      const dx = (s.tx - s.x) * LERP;
      s.x += dx;
      s.y += (s.ty - s.y) * LERP;
      s.skew += (clamp(-dx * SKEW_GAIN, -MAX_SKEW, MAX_SKEW) - s.skew) * 0.18;
      setX(s.x);
      setY(s.y);
      setSkew(s.skew);
      setRot(s.skew * 0.3);
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
    gsap.fromTo(layer, { clipPath: FROM_BELOW }, { clipPath: SHOW, duration: 0.9, ease: EASE_OUT });
    if (inner) gsap.fromTo(inner, { scale: 1.3 }, { scale: 1, duration: 1.2, ease: EASE_OUT });
    if (!s.shown) {
      s.shown = true;
      s.x = s.tx;
      s.y = s.ty;
      s.skew = 0;
      gsap.set(el, { x: s.x, y: s.y, autoAlpha: 1 });
      gsap.fromTo(el, { clipPath: FROM_BELOW }, { clipPath: SHOW, duration: 0.8, ease: EASE_OUT, overwrite: true });
    }
  }, [activeSlug, host]);

  if (!host) return null;
  return createPortal(
    <div
      ref={box}
      aria-hidden
      className="wk-preview"
      style={{ visibility: "hidden" }}
    >
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
            <div className="wk-preview-type" style={{ ["--pa" as string]: it.accent }}>
              <span>{it.name}</span>
            </div>
          )}
        </div>
      ))}
    </div>,
    host,
  );
}
