"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "@/lib/animations/gsap-config";

// Konami code → easter egg.
const KONAMI = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

export interface UseCommandKeysOptions {
  inputRef: RefObject<HTMLInputElement | null>;
  /** Reset to the default scene + clear any answer line. */
  reset: () => void;
  /** Submit the current input value (Enter while focused). */
  submit: () => void;
}

export interface UseCommandKeysResult {
  /** Whether the easter-egg burst is currently playing. */
  eggActive: boolean;
}

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return (
    tag === "INPUT" ||
    tag === "TEXTAREA" ||
    tag === "SELECT" ||
    el.isContentEditable
  );
}

/**
 * Minimal, human-natural keyboard wiring for the command center:
 *  - `/`      focus the command input (the one dev-conventional extra)
 *  - `enter`  ask (while the input is focused)
 *  - `esc`    reset to default (and blur the input)
 *  - konami   hidden: terracotta confetti + a pani-puri toast
 *
 * Deliberately nothing else — number-jump shortcuts and a `?` cheat-sheet
 * overlay proved to be more UI than the interaction deserved.
 */
export function useCommandKeys({
  inputRef,
  reset,
  submit,
}: UseCommandKeysOptions): UseCommandKeysResult {
  const [eggActive, setEggActive] = useState(false);
  const konamiIndex = useRef(0);
  const eggTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const triggerEgg = useCallback(() => {
    if (prefersReducedMotion()) return;
    setEggActive(true);
    if (eggTimer.current) clearTimeout(eggTimer.current);
    eggTimer.current = setTimeout(() => setEggActive(false), 2600);
  }, []);

  // Konami tracking lives on every keydown regardless of focus.
  const trackKonami = useCallback(
    (key: string) => {
      const expected = KONAMI[konamiIndex.current];
      const match =
        key === expected ||
        (expected.length === 1 && key.toLowerCase() === expected);
      if (match) {
        konamiIndex.current += 1;
        if (konamiIndex.current === KONAMI.length) {
          konamiIndex.current = 0;
          triggerEgg();
        }
      } else {
        // Allow a fresh start if the mismatched key is the first konami key.
        konamiIndex.current = key === KONAMI[0] ? 1 : 0;
      }
    },
    [triggerEgg]
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Never hijack browser/system shortcuts.
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      trackKonami(e.key);

      const typing = isTypingTarget(e.target);
      const inputFocused = e.target === inputRef.current;

      // ---- While typing in a field ----
      if (typing) {
        if (inputFocused && e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          submit();
          return;
        }
        if (inputFocused && e.key === "Escape") {
          e.preventDefault();
          inputRef.current?.blur();
          reset();
          return;
        }
        // Any other key: let the field handle it.
        return;
      }

      // ---- Global (not typing) shortcuts ----
      if (e.key === "/") {
        e.preventDefault();
        inputRef.current?.focus();
        return;
      }
      if (e.key === "Escape") {
        reset();
        return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputRef, reset, submit, trackKonami]);

  // Clean up the egg timer on unmount.
  useEffect(() => {
    return () => {
      if (eggTimer.current) clearTimeout(eggTimer.current);
    };
  }, []);

  return { eggActive };
}
