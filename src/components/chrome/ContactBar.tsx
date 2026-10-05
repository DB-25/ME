"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { profile } from "@/content";
import { assetUrl } from "@/lib/asset";
import { mailtoHref } from "@/components/sections/contact/mailto";

/** Show once the hero's scroll-out is done (the hero carries the same links itself). */
const SHOW_AFTER_VIEWPORTS = 0.5;
/** Body classes owned by other layers. While any is present the bar steps aside. */
const COVERING_CLASSES = ["menu-open", "director-active"];
/** The Director HUD overlay also marks itself, so it works even without the body class. */
const COVERING_SELECTOR = "[data-director-hud]";
/** The Contact chapter carries these same links, bigger: the bar steps aside once it is on screen. */
const CONTACT_SELECTOR = '[data-chapter="contact"]';

function isCovered(): boolean {
  const { body } = document;
  return COVERING_CLASSES.some((c) => body.classList.contains(c)) || body.querySelector(`:scope > ${COVERING_SELECTOR}`) !== null;
}

/** Same hysteresis as the top nav: ignore scroll jitter smaller than this. */
const SCROLL_DELTA = 6;
/** Anything carrying this attribute (an open card, a demo with controls) keeps the bar off while any part of it is on screen. */
const AVOID_ATTR = "data-no-bar";
/** A focused control this close to the bottom edge would sit under the bar, so the bar steps aside (WCAG 2.4.11). */
const FOCUS_CLEARANCE_PX = 64;

const CSS = `
.contact-bar { transform: translateY(100%); visibility: hidden; transition: transform .6s var(--ease-out-expo), visibility 0s .6s; }
.contact-bar[data-show="true"] { transform: none; visibility: visible; transition: transform .6s var(--ease-out-expo), visibility 0s; }
/* Scrolling down (reading) tucks the bar away; scrolling up brings it back, like the top nav. It stays focusable while tucked, and focus inside it brings it back. */
.contact-bar[data-show="true"][data-away="true"] { transform: translateY(100%); }
/* Decorative absolutes in some sections overshoot the viewport; on mobile that widens the layout viewport and clips fixed UI. clip (unlike hidden) keeps sticky working. */
main { overflow-x: clip; }
`;

/**
 * Mobile-only sticky contact bar: Résumé, Email, LinkedIn. Available after the hero (and from the start on
 * routes without one); it hides on scroll down and returns on scroll up, like the top nav. It is also hidden while the
 * mobile menu or the Director HUD is open, once the Contact chapter (same links) is on screen, while an element marked
 * `data-no-bar` is on screen, and while a focused control would sit under it. Absent on /work/* (the case page has its own dock).
 *
 * Contract: anything that takes over the screen can hide this bar by adding a class
 * from COVERING_CLASSES to `document.body` (the mobile menu adds `menu-open`; the
 * Director should add `director-active` while its HUD runs). A `[data-director-hud]`
 * child of body works too.
 */
export function ContactBar() {
  const pathname = usePathname();
  const isHome = pathname === "/";
  // Case studies render their own mobile dock.
  const hasOwnDock = pathname.startsWith("/work");
  const [scrolled, setScrolled] = useState(false);
  const [covered, setCovered] = useState(false);
  const [atContact, setAtContact] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [avoiding, setAvoiding] = useState(false);
  const [focusClash, setFocusClash] = useState(false);
  const bar = useRef<HTMLElement>(null);

  useEffect(() => {
    let last = window.scrollY;
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last;
      setScrolled(y > window.innerHeight * SHOW_AFTER_VIEWPORTS);
      if (Math.abs(dy) <= SCROLL_DELTA) return;
      last = y;
      // The rubber-band bounce at the very end reports an upward scroll: it must not pop the bar back.
      const atEnd = y >= document.documentElement.scrollHeight - window.innerHeight - 2;
      if (dy < 0 && atEnd) return;
      setTucked(dy > 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [pathname]);

  // Keep clear of marked elements (open cards, demo controls) and of whatever has keyboard focus.
  useEffect(() => {
    let raf = 0;
    const check = () => {
      raf = 0;
      const vh = window.innerHeight;
      const marked = Array.from(document.querySelectorAll(`[${AVOID_ATTR}]`)).some((el) => {
        const r = el.getBoundingClientRect();
        return r.bottom > 0 && r.top < vh;
      });
      setAvoiding(marked);
    };
    const queue = () => {
      if (!raf) raf = requestAnimationFrame(check);
    };
    const onFocusIn = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null;
      if (!el || bar.current?.contains(el)) return;
      setFocusClash(el.getBoundingClientRect().bottom > window.innerHeight - FOCUS_CLEARANCE_PX);
    };
    const onFocusOut = () => setFocusClash(false);
    const mo = new MutationObserver(queue);
    mo.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["aria-expanded", "open", AVOID_ATTR] });
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    document.addEventListener("focusin", onFocusIn);
    document.addEventListener("focusout", onFocusOut);
    check();
    return () => {
      cancelAnimationFrame(raf);
      mo.disconnect();
      window.removeEventListener("scroll", queue);
      window.removeEventListener("resize", queue);
      document.removeEventListener("focusin", onFocusIn);
      document.removeEventListener("focusout", onFocusOut);
    };
  }, [pathname]);

  useEffect(() => {
    const sync = () => setCovered(isCovered());
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(document.body, { attributes: true, attributeFilter: ["class"], childList: true });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    const contact = document.querySelector(CONTACT_SELECTOR);
    if (!contact) return;
    const io = new IntersectionObserver(([entry]) => setAtContact(entry.isIntersecting), { rootMargin: "0px 0px -35% 0px" });
    io.observe(contact);
    return () => io.disconnect();
  }, [pathname]);

  if (hasOwnDock) return null;

  const show = (scrolled || !isHome) && !covered && !atContact && !avoiding;
  const away = tucked || focusClash;
  const linkedIn = profile.links.find((l) => l.label === "LinkedIn");
  const item = "flex h-[52px] items-center justify-center gap-1.5 text-[13px] font-medium text-ink transition-colors active:text-accent-hot";

  return (
    <nav
      aria-label="Contact"
      ref={bar}
      data-show={show}
      data-away={away}
      inert={!show}
      onFocusCapture={() => setTucked(false)}
      className="contact-bar fixed inset-x-0 bottom-0 z-[60] border-t border-hairline-strong bg-void md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
    >
      <style>{CSS}</style>
      <ul className="grid grid-cols-3 divide-x divide-hairline">
        <li>
          <a href={assetUrl(profile.resumeHref)} target="_blank" rel="noopener" className={item}>
            Résumé <span aria-hidden className="text-accent-hot">↗</span>
          </a>
        </li>
        <li>
          <a href={mailtoHref(profile.email)} className={item}>
            Email <span aria-hidden className="text-accent-hot">↗</span>
          </a>
        </li>
        {linkedIn && (
          <li>
            <a href={linkedIn.href} target="_blank" rel="noopener" className={item}>
              LinkedIn <span aria-hidden className="text-accent-hot">↗</span>
            </a>
          </li>
        )}
      </ul>
    </nav>
  );
}
