"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import { prefersReducedMotion } from "@/lib/animations/gsap-config";
import type { SceneId } from "./bento-scenes";

// Number keys 1–4 jump to the four flagship project scenes.
const NUMBER_SCENES: SceneId[] = ["genie", "aiep", "vct", "one-l"];

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
  /** Switch the bento to a scene. */
  setScene: (scene: SceneId) => void;
  /** Reset to the default scene + clear any answer line. */
  reset: () => void;
  /** Submit the current input value (Enter while focused). */
  submit: () => void;
}

export interface UseCommandKeysResult {
  /** Whether the shortcuts overlay is visible. */
  showShortcuts: boolean;
  setShowShortcuts: (v: boolean) => void;
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
 * Wires Bruno-Simon-style keyboard exploration for the command center:
 *  - `/`      focus the command input
 *  - `?`      toggle the shortcuts overlay
 *  - `1`–`4`  jump to [genie, aiep, vct, one-l]
 *  - `esc`    reset to default (and blur input / close overlay)
 *  - konami   terracotta confetti burst + a pani-puri / Valorant toast
 *
 * Keystrokes are ignored while typing in a field, EXCEPT Enter (submit) and
 * Escape (blur) when the command input itself is focused.
 */
export function useCommandKeys({
  inputRef,
  setScene,
  reset,
  submit,
}: UseCommandKeysOptions): UseCommandKeysResult {
  const [showShortcuts, setShowShortcuts] = useState(false);
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
      switch (e.key) {
        case "/": {
          e.preventDefault();
          inputRef.current?.focus();
          return;
        }
        case "?": {
          e.preventDefault();
          setShowShortcuts((prev) => !prev);
          return;
        }
        case "Escape": {
          if (showShortcuts) {
            setShowShortcuts(false);
          } else {
            reset();
          }
          return;
        }
        case "1":
        case "2":
        case "3":
        case "4": {
          e.preventDefault();
          const scene = NUMBER_SCENES[Number(e.key) - 1];
          if (scene) setScene(scene);
          return;
        }
        default:
          return;
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [inputRef, setScene, reset, submit, trackKonami, showShortcuts]);

  // Clean up the egg timer on unmount.
  useEffect(() => {
    return () => {
      if (eggTimer.current) clearTimeout(eggTimer.current);
    };
  }, []);

  return { showShortcuts, setShowShortcuts, eggActive };
}
