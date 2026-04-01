"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, Download, HelpCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { label: "Journey", href: "#journey" },
  { label: "Projects", href: "#projects" },
  { label: "Skills", href: "#skills" },
  { label: "Impact", href: "#impact" },
  { label: "Contact", href: "#contact" },
];

/** Section IDs to observe (without the #) */
const SECTION_IDS = navLinks.map((l) => l.href.slice(1));

/**
 * Custom hook: observes which section is currently in the center of the viewport.
 * Uses IntersectionObserver with rootMargin that targets the middle 0% band,
 * so only the section intersecting the viewport center is "active".
 */
function useActiveSection(): string {
  const [activeSection, setActiveSection] = useState("");

  useEffect(() => {
    // rootMargin: shrink top by 50% and bottom by 50%
    // This means only elements crossing the viewport midpoint register as intersecting.
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      {
        rootMargin: "-50% 0px -50% 0px",
        threshold: 0,
      }
    );

    // Wait a tick for sections to mount (Next.js hydration)
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
  onAIClick: () => void;
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

  return (
    <>
      <motion.nav
        initial={{ opacity: 0, y: -20 }}
        animate={{
          opacity: scrolled ? 1 : 0,
          y: hidden ? -100 : 0,
        }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className={cn(
          "fixed top-0 left-0 right-0 z-50 transition-all",
          scrolled && "glass"
        )}
      >
        <div className="mx-auto max-w-7xl px-6 flex items-center justify-between h-16">
          {/* Logo */}
          <a
            href="#"
            className="font-mono font-bold text-lg tracking-tight text-accent-light hover:text-accent-lighter transition-colors"
          >
            DB25
          </a>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => {
              const sectionId = link.href.slice(1);
              const isActive = activeSection === sectionId;

              return (
                <a
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative text-sm transition-colors duration-200 pb-1",
                    isActive
                      ? "text-[var(--accent-light)]"
                      : "text-text-secondary hover:text-text-primary"
                  )}
                >
                  {link.label}
                  {/* Active indicator line */}
                  <span
                    className="absolute bottom-0 left-0 h-[2px] bg-[var(--accent)] transition-all duration-300"
                    style={{
                      width: isActive ? "100%" : "0%",
                      transitionTimingFunction:
                        "cubic-bezier(0.16, 1, 0.3, 1)",
                    }}
                  />
                </a>
              );
            })}
          </div>

          {/* Right Actions */}
          <div className="hidden md:flex items-center gap-3">
            <button
              onClick={onAIClick}
              className="flex items-center justify-center w-9 h-9 rounded-full glass-sm text-text-tertiary hover:text-accent-light transition-colors cursor-pointer"
              title="Ask AI (⌘K)"
            >
              <HelpCircle size={16} />
            </button>
            <a
              href="/resume.pdf"
              download
              className="flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 text-sm text-accent-light hover:bg-accent/20 transition-colors"
            >
              <Download size={14} />
              Resume
            </a>
          </div>

          {/* Mobile Hamburger */}
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="md:hidden p-2 text-text-secondary hover:text-text-primary cursor-pointer"
          >
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </motion.nav>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[60] bg-[#0A0A0A]/95 backdrop-blur-xl flex flex-col items-center justify-center gap-8"
          >
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-6 right-6 p-2 text-text-secondary hover:text-text-primary cursor-pointer"
            >
              <X size={24} />
            </button>
            {navLinks.map((link, i) => {
              const sectionId = link.href.slice(1);
              const isActive = activeSection === sectionId;

              return (
                <motion.a
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05, duration: 0.3 }}
                  className={cn(
                    "text-2xl font-semibold transition-colors",
                    isActive
                      ? "text-[var(--accent-light)]"
                      : "text-text-primary hover:text-accent-light"
                  )}
                >
                  {link.label}
                </motion.a>
              );
            })}
            <motion.button
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onClick={() => {
                onAIClick();
                setMobileOpen(false);
              }}
              className="flex items-center gap-2 px-6 py-3 rounded-full glass text-text-secondary cursor-pointer text-base"
            >
              <HelpCircle size={18} />
              Ask AI
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
