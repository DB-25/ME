"use client";

import { useEffect, useRef } from "react";
import { gsap, isCoarsePointer, prefersReducedMotion } from "@/lib/motion";

const RING = 38;
const RING_LABEL = 92;
const RING_MAGNET = 58;
const MAGNET_PULL = 0.32;
const INTERACTIVE = "a, button, [role='button'], summary, label[for]";
const TEXTY = "input, textarea, select, [contenteditable='true']";

/**
 * Dot (instant) + lagging ring. Conventions for other components:
 *  - `data-cursor="open"` (or any label): ring grows and shows that mono label.
 *  - any `a` / `button`: ring goes into a magnet state, pulled toward the element.
 * Only mounts on fine pointers without reduced motion; the native cursor is hidden
 * via `html.has-cursor` only while this is active.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const dotEl = dot.current;
    const ringEl = ring.current;
    const labelEl = label.current;
    if (!dotEl || !ringEl || !labelEl) return;
    if (isCoarsePointer() || prefersReducedMotion() || !window.matchMedia("(hover: hover)").matches) return;

    const root = document.documentElement;
    root.classList.add("has-cursor");

    gsap.set([dotEl, ringEl], { xPercent: -50, yPercent: -50, x: -100, y: -100 });
    const dotX = gsap.quickSetter(dotEl, "x", "px");
    const dotY = gsap.quickSetter(dotEl, "y", "px");
    const ringX = gsap.quickTo(ringEl, "x", { duration: 0.55, ease: "power3.out" });
    const ringY = gsap.quickTo(ringEl, "y", { duration: 0.55, ease: "power3.out" });

    let px = -100;
    let py = -100;
    let shown = false;
    let magnetEl: Element | null = null;
    let state: "idle" | "label" | "magnet" | "text" = "idle";

    const setVisible = (v: boolean) => {
      if (v === shown) return;
      shown = v;
      gsap.to([dotEl, ringEl], { opacity: v ? 1 : 0, duration: 0.3, overwrite: "auto" });
    };

    const applyRing = (next: typeof state, text = "") => {
      state = next;
      const size = next === "label" ? RING_LABEL : next === "magnet" ? RING_MAGNET : RING;
      gsap.to(ringEl, {
        width: size,
        height: size,
        backgroundColor: next === "label" ? "rgba(201,190,255,0.96)" : next === "magnet" ? "rgba(139,123,255,0.14)" : "rgba(139,123,255,0)",
        borderColor: next === "magnet" ? "rgba(201,190,255,0.9)" : next === "label" ? "rgba(201,190,255,1)" : "rgba(238,234,246,0.38)",
        duration: 0.6,
        ease: "expo.out",
        overwrite: "auto",
      });
      labelEl.textContent = text;
      gsap.to(labelEl, { opacity: next === "label" ? 1 : 0, duration: 0.25, overwrite: "auto" });
      gsap.to(dotEl, { scale: next === "idle" ? 1 : 0, duration: 0.3, ease: "expo.out", overwrite: "auto" });
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

    const onDown = () => gsap.to(ringEl, { scale: 0.86, duration: 0.2, ease: "power2.out", overwrite: "auto" });
    const onUp = () => gsap.to(ringEl, { scale: 1, duration: 0.5, ease: "expo.out", overwrite: "auto" });
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
      gsap.killTweensOf([dotEl, ringEl, labelEl]);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[120]">
      <div
        ref={ring}
        className="absolute left-0 top-0 flex items-center justify-center rounded-full border opacity-0"
        style={{ width: RING, height: RING, borderColor: "rgba(238,234,246,0.38)" }}
      >
        <span ref={label} className="label !text-[10px] !text-void opacity-0 whitespace-nowrap" />
      </div>
      <div ref={dot} className="absolute left-0 top-0 h-[6px] w-[6px] rounded-full bg-ink opacity-0" />
      <style>{`
        html.has-cursor, html.has-cursor * { cursor: none !important; }
        html.has-cursor :is(input, textarea, select, [contenteditable="true"]) { cursor: text !important; }
      `}</style>
    </div>
  );
}
