"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { profile } from "@/content";
import { gsap, scrollToTarget } from "@/lib/motion";
import { useSignal } from "@/lib/signal-store";
import { ChapterIndicator } from "./ChapterIndicator";
import { MobileMenu } from "./MobileMenu";
import { Magnetic } from "./Magnetic";
import { Roll } from "./Roll";

const LINKS = [
  { id: "work", label: "Work" },
  { id: "director", label: "Director" },
  { id: "contact", label: "Contact" },
] as const;

const SHOW_NEAR_TOP = 80;
const SCROLL_DELTA = 6;

export function goTo(id: string) {
  scrollToTarget(`#${id}`);
}

export function Nav() {
  const ready = useSignal((s) => s.ready);
  const bar = useRef<HTMLElement>(null);
  const menuButton = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const closeMenu = useCallback(() => setOpen(false), []);

  // Rise in once the preloader hands over.
  useEffect(() => {
    if (!ready || !bar.current) return;
    gsap.fromTo(
      bar.current,
      { opacity: 0, yPercent: -60 },
      { opacity: 1, yPercent: 0, duration: 1.1, ease: "expo.out", delay: 0.5 },
    );
  }, [ready]);

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

  const toTop = (e: React.MouseEvent) => {
    e.preventDefault();
    goTo("hero");
  };

  return (
    <>
      <header
        ref={bar}
        className="chrome-nav fixed inset-x-0 top-0 z-[80] opacity-0 mix-blend-difference"
      >
        <noscript>
          <style>{`.chrome-nav{opacity:1!important}`}</style>
        </noscript>
        <div className="mx-auto grid max-w-[var(--maxw)] grid-cols-[1fr_auto] items-center px-[var(--gutter)] py-5 md:grid-cols-[1fr_auto_1fr]">
          <a
            href="#hero"
            onClick={toTop}
            aria-label={`${profile.name}, back to top`}
            className="font-sans text-[15px] font-semibold tracking-[-0.04em] text-ink"
          >
            <Magnetic strength={0.4} pad={10}>
              {profile.handle}<span className="text-accent-hot">.</span>
            </Magnetic>
          </a>

          <ChapterIndicator className="max-md:hidden" />

          <div className="flex items-center justify-end gap-7">
            <nav aria-label="Primary" className="flex items-center gap-7 max-md:hidden">
              {LINKS.map((l) => (
                <a
                  key={l.id}
                  href={`#${l.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    goTo(l.id);
                  }}
                  className="link label !text-ink"
                >
                  {l.label}
                </a>
              ))}
              <a href={profile.resumeHref} target="_blank" rel="noopener" className="link label !text-ink">
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
              className="label !text-ink min-w-[5ch] text-right md:hidden"
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
