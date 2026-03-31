"use client";

import { useEffect, useState, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TypewriterTaglineProps {
  /** The text to type out character by character. */
  text: string;
  /** Delay in milliseconds before typing begins. */
  delay?: number;
  /** Typing speed in milliseconds per character. */
  speed?: number;
  /** Additional CSS class names. */
  className?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TypewriterTagline({
  text,
  delay = 0,
  speed = 40,
  className = "",
}: TypewriterTaglineProps) {
  const [displayedText, setDisplayedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [started, setStarted] = useState(false);
  const indexRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval>>(undefined);
  const delayRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Start typing after delay
  useEffect(() => {
    delayRef.current = setTimeout(() => {
      setStarted(true);
    }, delay);

    return () => {
      clearTimeout(delayRef.current);
    };
  }, [delay]);

  // Type characters one by one
  useEffect(() => {
    if (!started) return;

    indexRef.current = 0;
    setDisplayedText("");

    intervalRef.current = setInterval(() => {
      if (indexRef.current < text.length) {
        setDisplayedText(text.slice(0, indexRef.current + 1));
        indexRef.current++;
      } else {
        clearInterval(intervalRef.current);
      }
    }, speed);

    return () => {
      clearInterval(intervalRef.current);
    };
  }, [started, text, speed]);

  // Blink cursor
  useEffect(() => {
    const blink = setInterval(() => {
      setShowCursor((prev) => !prev);
    }, 530);

    return () => clearInterval(blink);
  }, []);

  return (
    <span className={className} aria-label={text} role="text">
      {displayedText}
      <span
        className="inline-block w-[2px] h-[1em] ml-0.5 align-middle"
        style={{
          backgroundColor: "var(--accent-light)",
          opacity: showCursor ? 1 : 0,
          transition: "opacity 0.1s ease",
        }}
        aria-hidden="true"
      />
    </span>
  );
}
