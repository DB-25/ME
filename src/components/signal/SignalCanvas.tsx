"use client";

import { useEffect, useRef } from "react";
import type { FieldQuality } from "./fieldTypes";
import { startEngine } from "./engine";

type Props = { quality: FieldQuality; onReady: () => void; onContextLost: () => void; onContextRestored: () => void; onError: (error: unknown) => void };

/** Mounts the imperative three.js engine into a div. Everything GL lives behind this module's async chunk. */
export default function SignalCanvas({ quality, onReady, onContextLost, onContextRestored, onError }: Props) {
  const host = useRef<HTMLDivElement>(null);
  // Latest callbacks without restarting the engine when the parent re-renders.
  const hooks = useRef({ onReady, onContextLost, onContextRestored, onError });
  useEffect(() => {
    hooks.current = { onReady, onContextLost, onContextRestored, onError };
  });

  useEffect(() => {
    if (!host.current) return;
    const engine = startEngine(host.current, quality, {
      onReady: () => hooks.current.onReady(),
      onContextLost: () => hooks.current.onContextLost(),
      onContextRestored: () => hooks.current.onContextRestored(),
      onError: (e) => hooks.current.onError(e),
    });
    return () => engine.dispose();
  }, [quality]);

  return <div ref={host} style={{ position: "absolute", inset: 0 }} />;
}
