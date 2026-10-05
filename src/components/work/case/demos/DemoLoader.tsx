"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";

/** The demo's code and state load only once its slot is within a screen or so of the viewport. */
const Demo = dynamic(() => import("./WhoSeesWhatDemo").then((m) => m.WhoSeesWhatDemo), { ssr: false });

const NEAR = "800px 0px";

export function DemoLoader() {
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
    <div ref={slot} className="wss-slot" aria-busy={!near}>
      {near ? <Demo /> : null}
      <noscript>
        <p className="wss-noscript">The stepper needs JavaScript. The same facts are written out under Production notes below.</p>
      </noscript>
    </div>
  );
}
