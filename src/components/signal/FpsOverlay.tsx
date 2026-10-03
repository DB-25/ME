"use client";

import { useEffect, useRef } from "react";

/** Dev overlay, shown with ?fps. Polls the probe the canvas writes; no per-frame React state. */
export function FpsOverlay() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const id = window.setInterval(() => {
      const fps = (window as unknown as { __signalFps?: number }).__signalFps;
      if (ref.current) ref.current.textContent = fps ? `${fps} fps` : "-- fps";
    }, 500);
    return () => window.clearInterval(id);
  }, []);
  return (
    <div
      ref={ref}
      style={{
        position: "fixed",
        left: 12,
        bottom: 12,
        zIndex: 9999,
        padding: "4px 8px",
        font: "11px/1 ui-monospace, monospace",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "#C9BEFF",
        background: "rgba(6,5,9,0.7)",
        border: "1px solid rgba(238,234,246,0.16)",
        pointerEvents: "none",
      }}
    >
      -- fps
    </div>
  );
}
