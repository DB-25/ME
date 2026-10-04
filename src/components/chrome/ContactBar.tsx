"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { profile } from "@/content";
import { assetUrl } from "@/lib/asset";

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

const CSS = `
.contact-bar { transform: translateY(100%); visibility: hidden; transition: transform .6s var(--ease-out-expo), visibility 0s .6s; }
.contact-bar[data-show="true"] { transform: none; visibility: visible; transition: transform .6s var(--ease-out-expo), visibility 0s; }
@media (max-width: 767px) { body { padding-bottom: calc(52px + env(safe-area-inset-bottom, 0px)); } }
/* Decorative absolutes in some sections overshoot the viewport; on mobile that widens the layout viewport and clips fixed UI. clip (unlike hidden) keeps sticky working. */
main { overflow-x: clip; }
`;

/**
 * Mobile-only sticky contact bar: Résumé, Email, LinkedIn. Visible at every scroll
 * depth after the hero (and from the start on routes without one), hidden while the
 * mobile menu or the Director HUD is open, and once the Contact chapter (same links) is on screen. Absent on /work/* (the case page has its own dock).
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > window.innerHeight * SHOW_AFTER_VIEWPORTS);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

  const show = (scrolled || !isHome) && !covered && !atContact;
  const linkedIn = profile.links.find((l) => l.label === "LinkedIn");
  const item = "flex h-[52px] items-center justify-center gap-1.5 text-[13px] font-medium text-ink transition-colors active:text-accent-hot";

  return (
    <nav
      aria-label="Contact"
      data-show={show}
      inert={!show}
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
          <a href={`mailto:${profile.email}`} className={item}>
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
