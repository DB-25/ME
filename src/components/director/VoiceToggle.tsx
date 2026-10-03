"use client";

import { useVoiceAvailable, useVoicePreference } from "@/lib/director/voice";
import { lineAudio } from "./lineAudio";

/** "Voice on" / "Voice off". Hidden until narration audio is known to exist. */
export function VoiceToggle({ className = "" }: { className?: string }) {
  const available = useVoiceAvailable();
  const [on, setOn] = useVoicePreference();
  if (!available) return null;

  const toggle = () => {
    const next = !on;
    setOn(next);
    // Turning it off silences the line in progress; its caption is cut short and the next ones run on the timer.
    if (!next) lineAudio.cancel();
  };

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label="Narration voice"
      onClick={toggle}
      className={`label border border-hairline-strong px-3 py-2 transition-colors duration-300 hover:border-accent focus-visible:border-accent ${
        on ? "text-ink" : "text-muted"
      } ${className}`}
    >
      <span className={on ? "text-accent" : "text-dim"} aria-hidden>
        {on ? "●" : "○"}
      </span>{" "}
      Voice {on ? "on" : "off"}
    </button>
  );
}
