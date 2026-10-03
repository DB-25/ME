"use client";

import { useEffect, useRef } from "react";
import { gsap, isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

// The ring is laid out once at RING px; every state is a transform scale (no layout work per frame).
const RING = 38;
const SCALE_LABEL = 52 / RING;
/** The label badge sits this far down-right of the pointer so it never covers the hovered text. */
const BADGE_OFFSET = 24;
const BADGE_EDGE = 8;
const SCALE_MAGNET = 58 / RING;
const PRESS_SCALE = 0.86;
const MAGNET_PULL = 0.32;
const INTERACTIVE = "a, button, [role='button'], summary, label[for]";
const TEXTY = "input, textarea, select, [contenteditable='true']";

/**
 * Dot (instant) + lagging ring. Conventions for other components:
 *  - `data-cursor="open"` (or any label): ring grows slightly and a small badge with that mono label
 *    trails 24px down-right of the pointer (flipping at viewport edges).
 *  - any `a` / `button`: ring goes into a magnet state, pulled toward the element.
 * Only mounts on fine pointers without reduced motion. While active, the native cursor is
 * hidden on the page and on interactive elements (see the scoped CSS below), never on text fields.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const badge = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dotEl = dot.current;
    const ringEl = ring.current;
    const badgeEl = badge.current;
    const labelEl = label.current;
    if (!dotEl || !ringEl || !badgeEl || !labelEl) return;
    if (isCoarsePointer() || prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;

    const root = document.documentElement;
    root.classList.add("has-cursor");

    gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    gsap.set(badgeEl, { x: -200, y: -200 });
    const badgeX = gsap.quickTo(badgeEl, "x", { duration: 0.3, ease: "power3.out" });
    const badgeY = gsap.quickTo(badgeEl, "y", { duration: 0.3, ease: "power3.out" });
    const dotX = gsap.quickSetter(dotEl, "x", "px");
    const dotY = gsap.quickSetter(dotEl, "y", "px");
    const ringX = gsap.quickTo(ringEl, "x", { duration: 0.55, ease: "power3.out" });
    const ringY = gsap.quickTo(ringEl, "y", { duration: 0.55, ease: "power3.out" });

    let px = -100;
    let py = -100;
    let shown = false;
    let magnetEl: Element | null = null;
    let state: "idle" | "label" | "magnet" | "text" = "idle";
    let pressed = false;

    const ringScale = () => (state === "label" ? SCALE_LABEL : state === "magnet" ? SCALE_MAGNET : 1) * (pressed ? PRESS_SCALE : 1);
    const applyScale = (duration: number, ease: string) => {
      gsap.to(ringEl, { scale: ringScale(), duration, ease, overwrite: "auto" });
    };
    // Down-right of the pointer; flips to the other side when it would leave the viewport.
    const placeBadge = () => {
      const w = badgeEl.offsetWidth;
      const h = badgeEl.offsetHeight;
      const x = px + BADGE_OFFSET + w + BADGE_EDGE > window.innerWidth ? px - BADGE_OFFSET - w : px + BADGE_OFFSET;
      const y = py + BADGE_OFFSET + h + BADGE_EDGE > window.innerHeight ? py - BADGE_OFFSET - h : py + BADGE_OFFSET;
      badgeX(x);
      badgeY(y);
    };

    const setVisible = (v: boolean) => {
      if (v === shown) return;
      shown = v;
      gsap.to([dotEl, ringEl], { opacity: v ? 1 : 0, duration: 0.3, overwrite: "auto" });
    };

    const applyRing = (next: typeof state, text = "") => {
      state = next;
      gsap.to(ringEl, {
        backgroundColor: next === "label" ? "rgba(139,123,255,0.16)" : next === "magnet" ? "rgba(139,123,255,0.14)" : "rgba(139,123,255,0)",
        borderColor: next === "magnet" ? "rgba(201,190,255,0.9)" : next === "label" ? "rgba(201,190,255,1)" : "rgba(238,234,246,0.38)",
        duration: 0.6,
        ease: "expo.out",
        overwrite: "auto",
      });
      applyScale(0.6, "expo.out");
      if (next === "label") {
        labelEl.textContent = text;
        placeBadge();
      }
      gsap.to(badgeEl, { opacity: next === "label" ? 1 : 0, duration: 0.25, overwrite: "auto" });
      gsap.to(dotEl, { scale: next === "idle" || next === "label" ? 1 : 0, duration: 0.3, ease: "expo.out", overwrite: "auto" });
    };

    const retarget = () => {
      if (state === "magnet" && magnetEl) {
        const r = magnetEl.getBoundingClientRect();
        const cx = r.left + r.width / 2;
        const cy = r.top + r.height / 2;
        ringX(px + (cx - px) * MAGNET_PULL);
        ringY(py + (cy - py) * MAGNET_PULL);
      } else {
        ringX(px);
        ringY(py);
      }
    };

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === "touch") return;
      px = e.clientX;
      py = e.clientY;
      if (!shown) {
        gsap.set(ringEl, { x: px, y: py });
        setVisible(true);
      }
      dotX(px);
      dotY(py);
      retarget();
      if (state === "label") placeBadge();
    };

    const onOver = (e: PointerEvent) => {
      const t = e.target as Element | null;
      if (!t || !t.closest) return;
      if (t.closest(TEXTY)) {
        magnetEl = null;
        if (state !== "text") {
          state = "text";
          setVisible(false);
        }
        return;
      }
      if (state === "text") setVisible(true);
      const labelled = t.closest<HTMLElement>("[data-cursor]");
      if (labelled && labelled.dataset.cursor) {
        magnetEl = null;
        applyRing("label", labelled.dataset.cursor);
        return;
      }
      const hit = t.closest(INTERACTIVE);
      if (hit) {
        if (hit !== magnetEl || state !== "magnet") {
          magnetEl = hit;
          applyRing("magnet");
        }
        retarget();
        return;
      }
      if (state !== "idle") {
        magnetEl = null;
        applyRing("idle");
        retarget();
      }
    };

    const onDown = () => {
      pressed = true;
      applyScale(0.2, "power2.out");
    };
    const onUp = () => {
      pressed = false;
      applyScale(0.5, "expo.out");
    };
    const onLeaveDoc = () => setVisible(false);
    const onEnterDoc = () => state !== "text" && setVisible(true);

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    document.documentElement.addEventListener("pointerleave", onLeaveDoc);
    document.documentElement.addEventListener("pointerenter", onEnterDoc);
    // Scrolling moves elements under a still pointer; keep the magnet honest.
    window.addEventListener("scroll", retarget, { passive: true });

    return () => {
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerover", onOver);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.documentElement.removeEventListener("pointerleave", onLeaveDoc);
      document.documentElement.removeEventListener("pointerenter", onEnterDoc);
      window.removeEventListener("scroll", retarget);
      gsap.killTweensOf([dotEl, ringEl, badgeEl]);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120]">
      <div
        ref={ring}
        className="absolute left-0 top-0 flex items-center justify-center rounded-full border opacity-0 will-change-transform"
        style={{ width: RING, height: RING, borderColor: "rgba(238,234,246,0.38)" }}
      >
      </div>
      <div
        ref={badge}
        className="absolute left-0 top-0 whitespace-nowrap rounded-full border border-accent-hot bg-[rgb(201,190,255)] px-2.5 py-1 opacity-0 will-change-transform"
      >
        <span ref={label} className="label block !text-[11px] !font-medium !leading-none !text-void" />
      </div>
      <div ref={dot} className="absolute left-0 top-0 h-[6px] w-[6px] rounded-full bg-ink opacity-0" />
      <style>{`
        @media (hover: hover) and (pointer: fine) {
          html.has-cursor { cursor: none; }
          html.has-cursor :is(a, button, [role="button"], summary, label[for], [data-cursor]) { cursor: none; }
          html.has-cursor :is(input, textarea, select, [contenteditable="true"]) { cursor: text; }
        }
      `}</style>
    </div>
  );
}
