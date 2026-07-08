"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Story", href: "#story" },
  { label: "Work", href: "#work" },
  { label: "Stack", href: "#stack" },
  { label: "Impact", href: "#impact" },
  { label: "Contact", href: "#contact" },
];

/** Section IDs to observe (without the #) */
const SECTION_IDS = navLinks.map((l) => l.href.slice(1));

/**
 * Observes which section currently crosses the viewport midpoint.
 * Same IntersectionObserver pattern as before, retargeted to the new IDs.
 */
function useActiveSection(): string {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-50% 0px -50% 0px", threshold: 0 }
    );

    const timer = setTimeout(() => {
      for (const id of SECTION_IDS) {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, []);

  return activeSection;
}

interface NavigationProps {
  /** Optional, kept for back-compat. The Ask affordance always dispatches the event too. */
  onAIClick?: () => void;
}

export function Navigation({ onAIClick }: NavigationProps) {
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const activeSection = useActiveSection();

  const handleScroll = useCallback(() => {
    const currentY = window.scrollY;
    setScrolled(currentY > 100);
    setHidden(currentY > lastScrollY && currentY > 400);
    setLastScrollY(currentY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  // Fires both the legacy callback (if provided) AND the global command event.
  const openCommand = useCallback(() => {
    onAIClick?.();
    window.dispatchEvent(new CustomEvent("dhruv:open-command"));
  }, [onAIClick]);

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: scrolled ? 1 : 0, y: hidden ? -100 : 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50",
          scrolled && "glass-sm hairline-b",
          !scrolled && "pointer-events-none"
        )}
      >
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          {/* Logo */}
          <a
            href="#top"
            className="font-mono text-sm font-medium tracking-tight text-[var(--text-primary)] transition-colors hover:text-[var(--accent)]"
          >
            DB25
          </a>

          {/* Desktop links — mono */}
          <div className="hidden items-center gap-7 md:flex">
            {navLinks.map((link) => {
              const isActive = activeSection === link.href.slice(1);
              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "font-mono text-[0.72rem] uppercase tracking-[0.14em] transition-colors duration-200",
                    isActive
                      ? "text-[var(--accent)]"
                      : "text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                  )}
                >
                  {link.label}
                </a>
              );
            })}
          </div>

          {/* Right actions */}
          <div className="hidden items-center gap-5 md:flex">
            <button
              onClick={openCommand}
              className="group flex items-center gap-2 font-mono text-[0.72rem] uppercase tracking-[0.14em] text-[var(--text-tertiary)] transition-colors hover:text-[var(--text-primary)] cursor-pointer"
              title="Ask anything (⌘K)"
            >
              Ask
              <span className="kbd">⌘K</span>
            </button>
            <a
              href="/resume.pdf"
              download
              className="link-grow font-mono text-[0.72rem] uppercase tracking-[0.14em]"
            >
              Resume
            </a>
          </div>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            className="p-1.5 text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] md:hidden cursor-pointer"
          >
            <Menu size={22} />
          </button>
        </div>
      </motion.nav>

      {/* Mobile menu overlay — hairline, near-black */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="fixed inset-0 z-[60] flex flex-col bg-[var(--bg-primary)]/97 backdrop-blur-xl md:hidden"
          >
            <div className="flex h-14 items-center justify-between px-6 hairline-b">
              <span className="font-mono text-sm font-medium text-[var(--text-primary)]">
                DB25
              </span>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="p-1.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] cursor-pointer"
              >
                <X size={22} />
              </button>
            </div>

            <div className="flex flex-1 flex-col justify-center gap-2 px-8">
              {navLinks.map((link, i) => {
                const isActive = activeSection === link.href.slice(1);
                return (
                  <motion.a
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileOpen(false)}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05, duration: 0.3 }}
                    className={cn(
                      "flex items-baseline gap-3 py-3 text-3xl font-semibold tracking-tight transition-colors",
                      isActive
                        ? "text-[var(--accent)]"
                        : "text-[var(--text-primary)]"
                    )}
                  >
                    <span className="font-mono text-[0.7rem] text-[var(--text-faint)]">
                      0{i + 1}
                    </span>
                    {link.label}
                  </motion.a>
                );
              })}
            </div>

            <div className="flex items-center justify-between gap-4 px-8 pb-12">
              <button
                onClick={() => {
                  openCommand();
                  setMobileOpen(false);
                }}
                className="flex items-center gap-2 font-mono text-[0.78rem] uppercase tracking-[0.14em] text-[var(--text-secondary)] cursor-pointer"
              >
                Ask
                <span className="kbd">⌘K</span>
              </button>
              <a
                href="/resume.pdf"
                download
                onClick={() => setMobileOpen(false)}
                className="link-grow font-mono text-[0.78rem] uppercase tracking-[0.14em]"
              >
                Resume
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
