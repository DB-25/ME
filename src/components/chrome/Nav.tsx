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

  // Hide on scroll down, show on scroll up.
  useEffect(() => {
    let last = window.scrollY;
    let hidden = false;
    const setHidden = (h: boolean) => {
      if (h === hidden || !bar.current) return;
      hidden = h;
      gsap.to(bar.current, { yPercent: h ? -110 : 0, duration: 0.7, ease: "expo.out", overwrite: "auto" });
    };
    const onScroll = () => {
      const y = window.scrollY;
      const dy = y - last;
      if (openRef.current || y < SHOW_NEAR_TOP) setHidden(false);
      else if (Math.abs(dy) > SCROLL_DELTA) setHidden(dy > 0);
      if (Math.abs(dy) > SCROLL_DELTA) last = y;
    };
    // Keyboard focus inside the bar always brings it back, so Tab never lands on an off-screen link.
    const onFocusIn = () => setHidden(false);
    const header = bar.current;
    window.addEventListener("scroll", onScroll, { passive: true });
    header?.addEventListener("focusin", onFocusIn);
    return () => {
      window.removeEventListener("scroll", onScroll);
      header?.removeEventListener("focusin", onFocusIn);
    };
  }, []);

  const logoClass = "font-sans text-[15px] font-semibold tracking-[-0.04em] text-ink";
  // The visible text is "DB", so the accessible name starts with it (WCAG 2.5.3). The dot is decoration.
  const logo = (
    <Magnetic strength={0.4} pad={10}>
      DB<span aria-hidden className="text-accent-hot">.</span>
      <span className="sr-only">, {profile.name}, {isHome ? "back to top" : "home"}</span>
    </Magnetic>
  );

  return (
    <>
      <header ref={bar} className="chrome-nav fixed inset-x-0 top-0 z-[80] mix-blend-difference">
        <div className="mx-auto grid max-w-[var(--maxw)] grid-cols-[1fr_auto] items-center px-[var(--gutter)] py-5 md:grid-cols-[1fr_auto_1fr]">
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

          <ChapterIndicator className="max-md:hidden" />

          <div className="flex items-center justify-end gap-7">
            <nav aria-label="Primary" className="flex items-center gap-7 max-md:hidden">
              {NAV_ITEMS.map((l) => (
                <SectionLink key={l.id} id={l.id} className="link label !text-ink">
                  {l.label}
                </SectionLink>
              ))}
              <a href={assetUrl(profile.resumeHref)} target="_blank" rel="noopener" className="link label !text-ink">
                Résumé<span aria-hidden> ↗</span>
              </a>
            </nav>

            <ChapterIndicator className="md:hidden" />
            <button
              ref={menuButton}
              type="button"
              aria-expanded={open}
              aria-controls="chrome-menu"
              onClick={() => setOpen((o) => !o)}
              className="label !text-ink -my-3 min-w-[5ch] py-3 text-right md:hidden"
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
