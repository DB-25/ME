"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { isDirectorConfigured } from "@/lib/director/client";
import { scrollToTarget } from "@/lib/motion";
import { DirectorHud } from "./DirectorHud";
import "./director.css";
import { useDirectorRun } from "./useDirectorRun";

const TAKES = [
  "I'm hiring an AI engineer",
  "Show me the hardest problem",
  "I'm a founder",
  "Draw me a pani puri",
];

const FOCUS_DELAY_MS = 1400;

export function Director() {
  const { state, run, cut } = useDirectorRun();
  const [value, setValue] = useState("");
  const [inView, setInView] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wasRunning = useRef(false);
  const live = isDirectorConfigured();
  const running = state.phase !== "idle";

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Focus returns to the input after a take, if the visitor can see it.
  useEffect(() => {
    if (wasRunning.current && !running && inView) inputRef.current?.focus({ preventScroll: true });
    wasRunning.current = running;
  }, [running, inView]);

  const submit = (text: string) => {
    const prompt = text.trim();
    if (!prompt || running) return;
    setValue("");
    inputRef.current?.blur();
    void run(prompt);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(value);
  };

  const anotherTake = () => {
    scrollToTarget("#director");
    window.setTimeout(() => inputRef.current?.focus({ preventScroll: true }), FOCUS_DELAY_MS);
  };

  const empty = value.length === 0;

  return (
    <section
      ref={sectionRef}
      id="director"
      data-chapter="director"
      aria-labelledby="director-title"
      className="relative flex min-h-screen items-center py-28 md:py-36"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-r from-void/90 via-void/65 to-void/10"
      />
      <div
        className="shell relative w-full transition-opacity duration-700 ease-[var(--ease-out-expo)]"
        style={{ opacity: running ? 0.06 : 1 }}
        inert={running}
      >
        <div className="slate flex flex-wrap items-center gap-x-8 gap-y-2 pb-5">
          <SectionLabel chapter="director" />
          <p className="label hidden sm:block">{live ? "Live" : "Offline, scripted"}</p>
        </div>

        <h2 id="director-title" className="display text-[length:var(--text-display)]">
          <Reveal as="span" className="block">
            Don&rsquo;t scroll.
            <br />
            <Emph>Direct.</Emph>
          </Reveal>
        </h2>

        <p className="lede mt-8 max-w-[52ch]">
          Tell the site who you are or what you want. It scrolls, spotlights the work and redraws the particles behind
          this page.
          {live ? "" : " No live model is connected here, so this plays a scripted offline cut, written from the real content."}
        </p>

        <form onSubmit={onSubmit} className="relative mt-16 md:mt-24" aria-label="Tell the Director what you want">
          <label htmlFor="director-input" className="label mb-4 block">
            Your line, then Enter
          </label>
          <div
            className="relative border-b border-hairline-strong pb-4 transition-colors duration-300 focus-within:border-accent"
            style={{ fontSize: "clamp(1.5rem, 4.6vw, 4rem)", lineHeight: 1.15 }}
          >
            {empty && (
              <span
                aria-hidden
                className="director-caret pointer-events-none absolute left-0 top-[0.2em] h-[0.76em] w-[0.42ch] bg-accent-hot"
              />
            )}
            <input
              id="director-input"
              ref={inputRef}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              disabled={running}
              autoComplete="off"
              autoCorrect="off"
              spellCheck={false}
              enterKeyHint="go"
              maxLength={160}
              placeholder="I'm a founder, I'm hiring, draw me something"
              className={`director-input w-full text-[1em] leading-[inherit] bg-transparent font-medium tracking-[-0.035em] text-ink outline-none placeholder:text-muted/50 disabled:opacity-40 ${
                empty ? "pl-[0.7ch]" : ""
              }`}
            />
          </div>
          <div className="mt-4 flex items-center justify-between gap-6">
            <p className="label">
              <span className="text-accent">Enter</span> to begin <span className="mx-2 text-dim">/</span>{" "}
              <span className="text-accent">Esc</span> to stop
            </p>
            <button
              type="submit"
              disabled={empty || running}
              className="label link text-ink transition-opacity disabled:pointer-events-none disabled:opacity-30"
            >
              Begin &rarr;
            </button>
          </div>
        </form>

        <ul className="mt-12 flex flex-wrap gap-x-3 gap-y-3" aria-label="Suggested takes">
          {TAKES.map((take) => (
            <li key={take}>
              <button
                type="button"
                disabled={running}
                onClick={() => submit(take)}
                className="label border border-hairline-strong px-3 py-2 text-muted transition-[color,border-color,background-color] duration-300 hover:border-accent hover:text-ink focus-visible:border-accent disabled:opacity-40"
              >
                {take}
              </button>
            </li>
          ))}
        </ul>
      </div>

      <DirectorHud state={state} onCut={cut} showAnotherTake={state.afterglow && !running && !inView} onAnotherTake={anotherTake} />
    </section>
  );
}
