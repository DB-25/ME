"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { gsap, ScrollTrigger } from "@/lib/motion";
import { caseHref } from "../asset";

/** Fixed bottom bar: back to the index, where you are, and a scroll hairline. Sits below the global nav. */
export function CaseNav({ name, nextSlug, nextName }: { name: string; nextSlug: string; nextName: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const fill = useRef<HTMLDivElement>(null);
  const [label, setLabel] = useState("Overview");

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
        for (const e of entries) if (e.isIntersecting) setLabel(e.target.getAttribute("data-cs-label") ?? "Overview");
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    secs.forEach((s) => io.observe(s));
    const onScroll = () => {
      if (window.scrollY < 200) setLabel("Overview");
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      io.disconnect();
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  return (
    <nav ref={bar} aria-label="Case study" className="cs-nav">
      <div className="cs-nav-progress" aria-hidden>
        <div ref={fill} />
      </div>
      <div className="cs-nav-in">
        <Link href="/#work" className="cs-nav-back label link">
          <span aria-hidden>&larr; </span>All work
        </Link>
        <p className="cs-nav-where label" aria-live="polite">
          <span className="cs-nav-name">{name}</span>
          <span className="text-faint"> / </span>
          {label}
        </p>
        <Link href={caseHref(nextSlug)} className="cs-nav-next label link" aria-label={`Next project: ${nextName}`}>
          Next<span className="cs-nav-next-name">: {nextName}</span>
          <span aria-hidden> &rarr;</span>
        </Link>
      </div>
    </nav>
  );
}
