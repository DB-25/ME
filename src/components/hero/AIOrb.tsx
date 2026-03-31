"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useMousePosition } from "@/hooks/useMousePosition";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AIOrbProps {
  onClick?: () => void;
}

// ---------------------------------------------------------------------------
// Inject keyframes once
// ---------------------------------------------------------------------------

let stylesInjected = false;

function injectStyles() {
  if (stylesInjected || typeof document === "undefined") return;
  stylesInjected = true;
  const style = document.createElement("style");
  style.textContent = `
    @keyframes orb-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
  `;
  document.head.appendChild(style);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function AIOrb({ onClick }: AIOrbProps) {
  const { x, y } = useMousePosition(0.08);
  const [hovered, setHovered] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!initialized.current) {
      initialized.current = true;
      injectStyles();
    }
  }, []);

  const handleMouseEnter = useCallback(() => setHovered(true), []);
  const handleMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: x - 40,
        top: y - 40,
        willChange: "left, top",
      }}
      aria-hidden="true"
    >
      {/* Orb glow */}
      <button
        onClick={onClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "pointer-events-auto relative w-20 h-20 rounded-full cursor-pointer",
          "transition-transform duration-300 ease-out",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
        )}
        style={{
          background:
            "radial-gradient(circle at center, var(--accent) 0%, var(--accent-light) 40%, transparent 70%)",
          filter: "blur(40px)",
          animation: "orb-pulse 3s ease-in-out infinite",
        }}
        aria-label="Open AI Command Center"
        type="button"
      />

      {/* "Ask me anything" label */}
      <span
        className={cn(
          "absolute left-1/2 -translate-x-1/2 -bottom-8 whitespace-nowrap",
          "text-xs font-medium tracking-wide pointer-events-none",
          "transition-all duration-300 ease-out",
          hovered
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-1"
        )}
        style={{ color: "var(--accent-light)" }}
      >
        Ask me anything
      </span>
    </div>
  );
}
