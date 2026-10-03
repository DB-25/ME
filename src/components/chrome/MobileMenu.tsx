"use client";

import { useEffect, useRef, type RefObject } from "react";
import { profile } from "@/content";
import { CHAPTERS } from "@/lib/chapters";
import { gsap, prefersReducedMotion, scrollToTarget } from "@/lib/motion";
import { lockScroll } from "./scroll-lock";
import { assetUrl } from "@/lib/asset";

type Props = { open: boolean; onClose: () => void; toggle: RefObject<HTMLButtonElement | null> };

const ITEMS = CHAPTERS.filter((c) => c.id !== "hero");

function focusables(root: HTMLElement, toggle: HTMLElement | null): HTMLElement[] {
  const links = Array.from(root.querySelectorAll<HTMLElement>("a[href]"));
  return toggle ? [toggle, ...links] : links;
}

/** Full-screen menu: staggered line reveals, focus-trapped, Esc closes. */
export function MobileMenu({ open, onClose, toggle }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const lines = el.querySelectorAll("[data-line]");
    const reduced = prefersReducedMotion();

    if (first.current) {
      first.current = false;
      gsap.set(el, { autoAlpha: 0 });
      return;
    }

    if (!open) {
      gsap.to(el, { autoAlpha: 0, duration: reduced ? 0.01 : 0.4, ease: "power2.out", overwrite: true });
      return;
    }

    const unlock = lockScroll();
    const main = document.getElementById("main");
    main?.setAttribute("inert", "");
    gsap.set(lines, { yPercent: reduced ? 0 : 115 });
    gsap.to(el, { autoAlpha: 1, duration: reduced ? 0.01 : 0.35, ease: "power2.out", overwrite: true });
    if (!reduced) {
      gsap.to(lines, { yPercent: 0, duration: 1.1, ease: "expo.out", stagger: 0.05, delay: 0.1 });
    }
    const firstLink = el.querySelector<HTMLElement>("a[href]");
    const focusTimer = window.setTimeout(() => firstLink?.focus(), 80);

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = focusables(el, toggle.current);
      if (!list.length) return;
      e.preventDefault();
      const i = list.indexOf(document.activeElement as HTMLElement);
      const next = e.shiftKey ? (i <= 0 ? list.length - 1 : i - 1) : (i + 1) % list.length;
      list[next].focus();
    };
    const mq = window.matchMedia("(min-width: 768px)");
    const onMq = () => mq.matches && onClose();
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    const btn = toggle.current;

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      main?.removeAttribute("inert");
      unlock();
      btn?.focus({ preventScroll: true });
    };
  }, [open, onClose, toggle]);

  const go = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    onClose();
    // Let the scroll lock release before Lenis is asked to move.
    window.setTimeout(() => scrollToTarget(`#${id}`), 120);
  };

  return (
    <div
      ref={root}
      id="chrome-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="invisible fixed inset-0 z-[70] flex flex-col justify-between bg-void/[0.96] px-[var(--gutter)] pb-[var(--gutter)] pt-24 md:hidden"
    >
      <ul className="flex flex-col">
        {ITEMS.map((c) => (
          <li key={c.id} className="overflow-hidden border-b border-hairline">
            <a
              data-line
              href={`#${c.id}`}
              onClick={(e) => go(e, c.id)}
              className="flex items-baseline gap-4 py-[0.55rem] text-ink"
            >
              <span className="label w-6 !text-accent">{c.index}</span>
              <span className="display text-[clamp(2.1rem,9.5vw,3rem)]">{c.label}</span>
            </a>
          </li>
        ))}
      </ul>

      <div className="flex items-end justify-between gap-6">
        <div className="overflow-hidden">
          <a data-line href={assetUrl(profile.resumeHref)} target="_blank" rel="noopener" className="label block !text-ink">
            Résumé ↗
          </a>
        </div>
        <div className="overflow-hidden">
          <a data-line href={`mailto:${profile.email}`} className="label block !text-ink">
            {profile.email}
          </a>
        </div>
      </div>
    </div>
  );
}
