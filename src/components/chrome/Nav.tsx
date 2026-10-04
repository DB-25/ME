"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { profile } from "@/content";
import { gsap, scrollToTarget } from "@/lib/motion";
import { assetUrl } from "@/lib/asset";
import { ChapterIndicator } from "./ChapterIndicator";
import { MobileMenu } from "./MobileMenu";
import { Magnetic } from "./Magnetic";
import { NAV_ITEMS } from "./nav-items";
import { Roll } from "./Roll";
import { SectionLink } from "./SectionLink";

const SHOW_NEAR_TOP = 80;
const SCROLL_DELTA = 6;
/** The full link row needs ~1000px next to the chapter readout; below that the MENU overlay takes over. */
const DESKTOP_QUERY = "(min-width: 1024px)";

const CSS = `
.chrome-nav-inner { transition: padding .45s var(--ease-out-expo); }
/* Past the top the bar condenses into a slim strip with its own backing, so page text never runs under the logo or MENU.
   Desktop never hides it; phones hide it on scroll down and bring it back on scroll up. */
.chrome-nav { transition: background-color .35s, border-color .35s, backdrop-filter .35s; border-bottom: 1px solid transparent; }
.chrome-nav[data-compact="true"] {
  mix-blend-mode: normal;
  background: rgb(6 5 9 / 0.86);
  border-bottom-color: var(--color-hairline);
  -webkit-backdrop-filter: blur(14px) saturate(1.2);
  backdrop-filter: blur(14px) saturate(1.2);
}
.chrome-nav[data-compact="true"] .chrome-nav-inner { padding-block: 12px; }
`;

export function goTo(id: string) {
  scrollToTarget(`#${id}`);
}

export function Nav() {
  const isHome = usePathname() === "/";
  const bar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Mobile: hide on scroll down, show on scroll up. Desktop: stay, condensed, once off the top.
  useEffect(() => {
    const desktop = window.matchMedia(DESKTOP_QUERY);
    let last = window.scrollY;
    let hidden = false;
    const setHidden = (h: boolean) => {
      if (h === hidden || !bar.current) return;
      hidden = h;
      gsap.to(bar.current, { yPercent: h ? -110 : 0, duration: 0.7, ease: "expo.out", overwrite: "auto" });
    };
    const syncCompact = () => bar.current?.setAttribute("data-compact", String(window.scrollY >= SHOW_NEAR_TOP));
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last;
      syncCompact();
      if (desktop.matches) {
        setHidden(false);
        return;
      }
      if (openRef.current || y < SHOW_NEAR_TOP) setHidden(false);
      else if (Math.abs(dy) > SCROLL_DELTA) setHidden(dy > 0);
      if (Math.abs(dy) > SCROLL_DELTA) last = y;
    };
    // Keyboard focus inside the bar always brings it back, so Tab never lands on an off-screen link.
    const onFocusIn = () => setHidden(false);
    const header = bar.current;
    syncCompact();
    window.addEventListener("scroll", onScroll, { passive: true });
    desktop.addEventListener("change", onScroll);
    header?.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      desktop.removeEventListener("change", onScroll);
      header?.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const logoClass = "inline-flex font-sans text-[15px] font-semibold tracking-[-0.04em] text-ink";
  // The visible text is "DB", so the accessible name starts with it (WCAG 2.5.3). The dot is decoration.
  const logo = (
    <Magnetic strength={0.4} pad={14}>
      DB<span aria-hidden className="text-accent-hot">.</span>
      <span className="sr-only">, {profile.name}, {isHome ? "back to top" : "home"}</span>
    </Magnetic>
  );

  return (
    <>
      <style>{CSS}</style>
      <header ref={bar} data-compact="false" className="chrome-nav fixed inset-x-0 top-0 z-[80] mix-blend-difference">
        <div className="chrome-nav-inner mx-auto grid max-w-[var(--maxw)] grid-cols-[1fr_auto] items-center px-[var(--gutter)] py-5 lg:grid-cols-[1fr_auto_1fr]">
          <div className="flex items-center gap-5 justify-self-start">
            {isHome ? (
              <a
                href="#hero"
                onClick={(e) => {
                  e.preventDefault();
                  goTo("hero");
                }}
                className={logoClass}
              >
                {logo}
              </a>
            ) : (
              <Link href="/" className={logoClass}>
                {logo}
              </Link>
            )}
            {!isHome && (
              <Link href="/#work" className="label -my-3 inline-flex items-center gap-1.5 py-3 !text-ink lg:hidden">
                <span aria-hidden>←</span>
                Work
              </Link>
            )}
          </div>

          <ChapterIndicator className="max-lg:hidden" />

          <div className="flex items-center justify-end gap-7">
            <nav aria-label="Primary" className="flex items-center gap-7 max-lg:hidden">
              {NAV_ITEMS.map((l) => (
                <SectionLink key={l.id} id={l.id} className="link label !text-ink">
                  {l.label}
                </SectionLink>
              ))}
              <a href={assetUrl(profile.resumeHref)} target="_blank" rel="noopener" className="link label !text-ink">
                Résumé<span aria-hidden> ↗</span>
              </a>
            </nav>

            <ChapterIndicator className="lg:hidden" />
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls="chrome-menu"
              onClick={() => setOpen((o) => !o)}
              className="label !text-ink -my-4 min-w-[5ch] py-4 text-right lg:hidden"
            >
              <Roll value={open ? "CLOSE" : "MENU"} />
            </button>
          </div>
        </div>
      </header>
      <MobileMenu open={open} onClose={closeMenu} toggle={menuButton} />
    </>
  );
}
