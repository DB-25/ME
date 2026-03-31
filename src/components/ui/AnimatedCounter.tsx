"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useInView } from "framer-motion";

interface AnimatedCounterProps {
  value: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function AnimatedCounter({
  value,
  prefix = "",
  suffix = "",
  duration = 1500,
  className,
}: AnimatedCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.5 });
  const [displayValue, setDisplayValue] = useState(0);
  const hasAnimated = useRef(false);

  const animate = useCallback(() => {
    if (hasAnimated.current) return;
    hasAnimated.current = true;

    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutExpo(progress);

      setDisplayValue(easedProgress * value);

      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        setDisplayValue(value);
      }
    }

    requestAnimationFrame(tick);
  }, [value, duration]);

  useEffect(() => {
    if (isInView) {
      animate();
    }
  }, [isInView, animate]);

  const formatted =
    value >= 1 && Number.isInteger(value)
      ? Math.round(displayValue).toLocaleString()
      : displayValue.toFixed(1);

  return (
    <span
      ref={ref}
      className={className}
      style={{ fontVariantNumeric: "tabular-nums" }}
    >
      {prefix}
      {formatted}
      {suffix}
    </span>
  );
}
