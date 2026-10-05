"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { gsap, ScrollTrigger, scrollToTarget } from "@/lib/motion";
import { caseHref } from "../asset";

/** One row of the section menu. `key` is the section's `data-cs` value ("top" is the title sequence). */
export type CaseStop = { key: string; label: string; n: string };

const TOP: CaseStop = { key: "top", label: "Overview", n: "" };
/** Room kept above a section when the menu scrolls to it: the global bar on desktop, a breath on phones (the bar hides on scroll down). */
const OFFSET_DESKTOP = -72;
const OFFSET_PHONE = -16;

/** Fixed bottom bar: back to the index, where you are (and a menu to jump between sections), next project, and a scroll hairline. */
export function CaseNav({ name, nextSlug, nextName, stops }: { name: string; nextSlug: string; nextName: string; stops: CaseStop[] }) {
  const wrap = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const menuId = useId();
  const [active, setActive] = useState("top");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const f = fill.current;
    if (!f) return;
    gsap.set(f, { scaleX: 0, transformOrigin: "left center" });
    const st = ScrollTrigger.create({
      start: 0,
      end: "max",
      onUpdate: (self) => gsap.set(f, { scaleX: self.progress }),
    });
    return () => st.kill();
  }, []);

  useEffect(() => {
    const secs = [...document.querySelectorAll<HTMLElement>("[data-cs]")];
    if (!secs.length) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive((e.target as HTMLElement).dataset.cs ?? "top");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    secs.forEach((s) => io.observe(s));
    const onScroll = () => {
      if (window.scrollY < 200) setActive("top");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  // The menu is a disclosure: Escape and a press outside close it, Escape hands focus back to its button.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      setOpen(false);
      trigger.current?.focus();
    };
    const onDown = (e: PointerEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  const jump = (key: string) => {
    setOpen(false);
    if (key === "top") {
      scrollToTarget("#top");
      return;
    }
    const el = document.getElementById(`sec-${key}`);
    if (!el) return;
    scrollToTarget(el, window.matchMedia("(min-width: 1024px)").matches ? OFFSET_DESKTOP : OFFSET_PHONE);
  };

  const label = stops.find((s) => s.key === active)?.label ?? TOP.label;

  return (
    <nav aria-label="Case study" className="cs-nav">
      <div className="cs-nav-progress" aria-hidden>
        <div ref={fill} />
      </div>
      <div className="cs-nav-in">
        <Link href="/#work" prefetch={false} className="cs-nav-back label link">
          <span aria-hidden>&larr; </span>All work
        </Link>
        <div ref={wrap} className="cs-nav-where">
          <button
            ref={trigger}
            type="button"
            className="cs-nav-trigger label"
            aria-expanded={open}
            aria-controls={menuId}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="cs-nav-name">{name}</span>
            <span className="text-dim cs-nav-sep"> / </span>
            <span className="cs-nav-label">{label}</span>
            <span className="sr-only">, sections menu</span>
            <span aria-hidden className="cs-nav-caret" />
          </button>
          <ul id={menuId} className="cs-nav-menu" hidden={!open}>
            {stops.map((s) => (
              <li key={s.key}>
                <a
                  href={s.key === "top" ? "#top" : `#sec-${s.key}`}
                  className="cs-nav-stop label"
                  aria-current={s.key === active ? "location" : undefined}
                  onClick={(e) => {
                    e.preventDefault();
                    jump(s.key);
                  }}
                >
                  <span className="cs-nav-stop-n num">{s.n || (s.key === "top" ? "↑" : "·")}</span>
                  <span>{s.label}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <Link href={caseHref(nextSlug)} prefetch={false} className="cs-nav-next label link" aria-label={`Next project: ${nextName}`}>
          Next<span className="cs-nav-next-name">: {nextName}</span>
          <span aria-hidden> &rarr;</span>
        </Link>
      </div>
    </nav>
  );
}
