"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/** The sandbox's code and state load only once its slot is within a screen or so of the viewport. */
const Sandbox = dynamic(() => import("./CourseSandbox").then((m) => m.CourseSandbox), { ssr: false });

const NEAR = "800px 0px";

export function CourseSandboxLoader() {
  const slot = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = slot.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        setNear(true);
        io.disconnect();
      },
      { rootMargin: NEAR },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div ref={slot} className="cts-slot" aria-busy={!near}>
      {near ? <Sandbox /> : null}
      <noscript>
        <p className="cts-noscript">The sandbox needs JavaScript. The same rules are written out under What I built above.</p>
      </noscript>
    </div>
  );
}
