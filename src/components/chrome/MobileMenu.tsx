"use client";

import { mailtoHref } from "@/components/sections/contact/mailto";
import { useEffect, useRef, type RefObject } from "react";
import { profile } from "@/content";
import { gsap, prefersReducedMotion } from "@/lib/motion";
import { lockScroll } from "./scroll-lock";
import { assetUrl } from "@/lib/asset";
import { ReelButton } from "@/components/reel";
import { useSignal } from "@/lib/signal-store";
import { NAV_ITEMS } from "./nav-items";
import { SectionLink } from "./SectionLink";

const CSS = `
.menu-cell {
  display: flex; align-items: center; justify-content: center; gap: 0.5em; width: 100%; min-height: 48px;
  border: 1px solid var(--color-hairline-strong); border-radius: 2px;
  font-family: var(--font-mono); font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--color-ink);
}
.menu-esc { border: 1px solid var(--color-hairline-strong); border-radius: 2px; padding: 1px 5px; font-size: 10px; }
@media (hover: none) { .menu-esc { display: none; } }
`;

type Props = { open: boolean; onClose: () => void; toggle: RefObject<HTMLButtonElement | null> };

function focusables(root: HTMLElement, toggle: HTMLElement | null): HTMLElement[] {
  const links = Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
  return toggle ? [toggle, ...links] : links;
}

/** Full-screen menu: staggered line reveals, focus-trapped, Esc closes. */
export function MobileMenu({ open, onClose, toggle }: Props) {
  const root = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  const current = useSignal((s) => s.chapter);

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
    document.body.classList.add("menu-open");
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
      // The showreel dialog (a native modal) owns Esc and Tab while it is open.
      if (document.querySelector("dialog[open]")) return;
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
    const mq = window.matchMedia("(min-width: 1024px)");
    const onMq = () => mq.matches && onClose();
    document.addEventListener("keydown", onKey);
    mq.addEventListener("change", onMq);
    const btn = toggle.current;

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      mq.removeEventListener("change", onMq);
      main?.removeAttribute("inert");
      document.body.classList.remove("menu-open");
      unlock();
      btn?.focus({ preventScroll: true });
    };
  }, [open, onClose, toggle]);

  const linkedIn = profile.links.find((l) => l.label === "LinkedIn");
  const gitHub = profile.links.find((l) => l.label === "GitHub");
  const cells: { label: string; href: string; external: boolean }[] = [
    { label: "Résumé", href: assetUrl(profile.resumeHref), external: true },
    { label: "Email", href: mailtoHref(profile.email), external: false },
    ...(linkedIn ? [{ label: "LinkedIn", href: linkedIn.href, external: true }] : []),
    ...(gitHub ? [{ label: "GitHub", href: gitHub.href, external: true }] : []),
  ];

  return (
    <div
      ref={root}
      id="chrome-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Menu"
      className="invisible fixed inset-0 z-[70] flex flex-col bg-void px-[var(--gutter)] pb-[max(var(--gutter),env(safe-area-inset-bottom))] pt-[88px] lg:hidden"
    >
      <style>{CSS}</style>
      <ul className="flex flex-1 flex-col justify-center">
        {NAV_ITEMS.map((c) => (
          <li key={c.id} className="overflow-hidden border-b border-hairline first:border-t">
            <SectionLink
              data-line
              id={c.id}
              onNavigate={onClose}
              // Let the scroll lock release before Lenis is asked to move.
              delayMs={120}
              className="flex items-baseline justify-between py-4 text-ink"
              aria-current={c.id === current ? "location" : undefined}
            >
              <span className="display text-[clamp(2.4rem,11vw,3.25rem)]">{c.label}</span>
              {c.id === current && (
                <span aria-hidden className="label !text-accent-hot">
                  Here
                </span>
              )}
            </SectionLink>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 pt-6">
        <ul className="grid grid-cols-2 gap-2">
          {cells.map((c) => (
            <li key={c.label} className="overflow-hidden">
              <a
                data-line
                href={c.href}
                {...(c.external ? { target: "_blank", rel: "noopener" } : {})}
                className="menu-cell"
              >
                {c.label}
                <span aria-hidden className="text-accent-hot">
                  ↗
                </span>
              </a>
            </li>
          ))}
        </ul>
        <div className="overflow-hidden">
          <div data-line>
            <ReelButton className="menu-cell w-full" />
          </div>
        </div>
        <div className="overflow-hidden">
          <button data-line type="button" onClick={onClose} className="menu-cell w-full !border-transparent !text-muted">
            Close <span className="menu-esc">Esc</span>
          </button>
        </div>
      </div>
    </div>
  );
}
