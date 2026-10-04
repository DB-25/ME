"use client";

import { useCallback, useEffect, useRef, useState } from "react";

const RESET_MS = 2200;

export type CopyState = "idle" | "copied" | "failed";

/** Clipboard write with a legacy fallback; `state` resets itself. */
export function useCopy(text: string) {
  const [state, setState] = useState<CopyState>("idle");
  /** Counts successful copies, so a consumer can replay a one-shot effect on every copy. */
  const [count, setCount] = useState(0);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      ok = legacyCopy(text);
    }
    setState(ok ? "copied" : "failed");
    if (ok) setCount((n) => n + 1);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState("idle"), RESET_MS);
  }, [text]);

  return { state, copy, count };
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.cssText = "position:fixed;top:0;left:0;opacity:0";
  document.body.appendChild(area);
  area.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    area.remove();
  }
}
