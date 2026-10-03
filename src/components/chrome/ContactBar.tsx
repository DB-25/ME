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
 * mobile menu or the Director HUD is open.
 *
 * Contract: anything that takes over the screen can hide this bar by adding a class
 * from COVERING_CLASSES to `document.body` (the mobile menu adds `menu-open`; the
 * Director should add `director-active` while its HUD runs). A `[data-director-hud]`
 * child of body works too.
 */
export function ContactBar() {
  const isHome = usePathname() === "/";
  const [scrolled, setScrolled] = useState(false);
  const [covered, setCovered] = useState(false);

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

  const show = (scrolled || !isHome) && !covered;
  const linkedIn = profile.links.find((l) => l.label === "LinkedIn");
  const item = "flex h-[52px] items-center justify-center gap-1.5 text-[13px] font-medium text-ink";

  return (
    <nav
      aria-label="Contact"
      data-show={show}
      inert={!show}
      className="contact-bar fixed inset-x-0 bottom-0 z-[60] border-t border-hairline-strong bg-void/90 backdrop-blur-md md:hidden"
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
