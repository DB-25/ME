"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface MousePosition {
  x: number;
  y: number;
}

/**
 * Tracks mouse position with lerp smoothing.
 * Returns smoothed { x, y } coordinates that update each animation frame.
 */
export function useMousePosition(lerpFactor: number = 0.08): MousePosition {
  const mouseRef = useRef<MousePosition>({ x: 0, y: 0 });
  const smoothRef = useRef<MousePosition>({ x: 0, y: 0 });
  const rafRef = useRef<number>(0);
  const [pos, setPos] = useState<MousePosition>({ x: 0, y: 0 });

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current.x = e.clientX;
    mouseRef.current.y = e.clientY;
  }, []);

  useEffect(() => {
    let mounted = true;

    const cx = window.innerWidth / 2;
    const cy = window.innerHeight / 2;
    smoothRef.current = { x: cx, y: cy };
    mouseRef.current = { x: cx, y: cy };
    setPos({ x: cx, y: cy });

    window.addEventListener("mousemove", handleMouseMove, { passive: true });

    let frameCount = 0;
    const animate = () => {
      if (!mounted) return;

      smoothRef.current.x +=
        (mouseRef.current.x - smoothRef.current.x) * lerpFactor;
      smoothRef.current.y +=
        (mouseRef.current.y - smoothRef.current.y) * lerpFactor;

      // Throttle React state updates to every 2nd frame (~30fps)
      // to reduce re-renders while keeping visually smooth motion
      frameCount++;
      if (frameCount % 2 === 0) {
        setPos({
          x: smoothRef.current.x,
          y: smoothRef.current.y,
        });
      }

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);

    return () => {
      mounted = false;
      window.removeEventListener("mousemove", handleMouseMove);
      cancelAnimationFrame(rafRef.current);
    };
  }, [lerpFactor, handleMouseMove]);

  return pos;
}
