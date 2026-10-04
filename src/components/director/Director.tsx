"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Emph } from "@/components/ui/Emph";
import { Reveal } from "@/components/ui/Reveal";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { isDirectorConfigured } from "@/lib/director/client";
import { isCoarsePointer } from "@/lib/motion";
import { DirectorHud } from "./DirectorHud";
import { goToSection } from "./executor";
import { lineAudio } from "./lineAudio";
import { VoiceToggle } from "./VoiceToggle";
import { PERSONA_TOURS, TOUR_EVENT, claimTour, takePendingTour, type TourRequest } from "./tourBus";
import "./director.css";
import { useDirectorRun } from "./useDirectorRun";

/** Guided tours: the persona tours (also offered from the hero) first, then two lighter ones. Each label is also the request, so the HUD shows what was chosen. */
const TOURS = [...PERSONA_TOURS.map((t) => t.request), "Surprise me", "Draw me a pani puri"];

const FOCUS_DELAY_MS = 900;

export function Director() {
  const { state, run, cut, dismiss } = useDirectorRun();
  const [value, setValue] = useState("");
  const [inView, setInView] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const wasRunning = useRef(false);
  const live = isDirectorConfigured();
  const running = state.phase === "running" || state.phase === "outro";

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.45 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // The hero's tour chips start a take from anywhere on the page. A request made before this chunk
  // loaded is waiting in the bus; later ones arrive as an event, still inside the visitor's gesture.
  useEffect(() => {
    const start = (prompt: string) => {
      lineAudio.prime();
      void run(prompt);
    };
    const waiting = takePendingTour();
    if (waiting) start(waiting);
    const onTour = (e: Event) => {
      claimTour();
      start((e as CustomEvent<TourRequest>).detail.prompt);
    };
    window.addEventListener(TOUR_EVENT, onTour);
    return () => window.removeEventListener(TOUR_EVENT, onTour);
  }, [run]);

  // Focus returns to the input after a take, if the visitor can see it.
  useEffect(() => {
    // Not on a phone: focusing the input there would raise the keyboard over the tour cards.
    if (wasRunning.current && !running && inView && !isCoarsePointer()) inputRef.current?.focus({ preventScroll: true });
    wasRunning.current = running;
  }, [running, inView]);

  const submit = (text: string) => {
    const prompt = text.trim();
    if (!prompt || running) return;
    setValue("");
    inputRef.current?.blur();
    // Still inside the visitor's gesture: unlock audio playback before the first line.
    lineAudio.prime();
    void run(prompt);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    submit(value);
  };

  const anotherTake = () => {
    dismiss();
    void goToSection("director").then(() =>
      window.setTimeout(() => {
        if (!isCoarsePointer()) inputRef.current?.focus({ preventScroll: true });
      }, FOCUS_DELAY_MS),
    );
  };

  const empty = value.length === 0;

  return (
    <section
      ref={sectionRef}
      id="director"
      data-chapter="director"
      aria-labelledby="director-title"
      className="relative flex min-h-screen items-center py-24 md:py-28"
    >
      {/* Feathered on every side: no edge for the eye to catch where the section ends. */}
      <div
        aria-hidden
        className="pointer-events-none absolute transition-opacity duration-700 ease-[var(--ease-out-expo)]"
        style={{
          opacity: running ? 0 : 1,
          inset: "-12% -6%",
          background:
            "radial-gradient(ellipse 62% 56% at 30% 50%, rgb(6 5 9 / 0.78) 0%, rgb(6 5 9 / 0.5) 48%, transparent 100%)",
        }}
      />
      <div
        className="shell relative w-full"
        // Fades out, then leaves the layer entirely, so nothing ghosts through the drawing during a take.
        style={{
          opacity: running ? 0 : 1,
          visibility: running ? "hidden" : "visible",
          transition: running ? "opacity 0.7s, visibility 0s linear 0.7s" : "opacity 0.7s, visibility 0s",
        }}
        inert={running}
      >
        <div className="slate flex flex-wrap items-center gap-x-8 gap-y-2 pb-5">
          <SectionLabel chapter="director" />
          <p className="label hidden sm:block">{live ? "Live" : "Scripted tour"}</p>
        </div>

        <h2 id="director-title" className="display text-[length:var(--text-display)]">
          <Reveal as="span" className="block">
            Don&rsquo;t scroll.
            <br />
            <Emph>Direct.</Emph>
          </Reveal>
        </h2>

        <p className="lede mt-6 max-w-[52ch] md:mt-8">
          Pick a guided tour. The site scrolls, spotlights the work and redraws the particles behind this page.
        </p>

        <div className="mt-10 md:mt-12">
          <p id="director-tours" className="label mb-4">
            Choose a guided tour
          </p>
          <ul
            className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5"
            aria-labelledby="director-tours"
          >
            {TOURS.map((tour, i) => (
              <li key={tour} className={i === TOURS.length - 1 ? "col-span-2 md:col-span-1" : undefined}>
                <button
                  type="button"
                  disabled={running}
                  onClick={() => submit(tour)}
                  className="group flex h-full min-h-[7rem] w-full flex-col justify-between gap-8 border border-hairline-strong px-4 py-5 text-left sm:px-5 transition-[border-color,background-color] duration-300 hover:border-accent hover:bg-accent/[0.06] focus-visible:border-accent focus-visible:bg-accent/[0.06] active:bg-accent/[0.12] disabled:opacity-40"
                >
                  <span className="label text-dim">{String(i + 1).padStart(2, "0")}</span>
                  <span className="flex items-end justify-between gap-3 text-[clamp(1.125rem,1.7vw,1.5rem)] font-medium leading-tight tracking-[-0.025em] text-ink">
                    <span className="text-balance">{tour}</span>
                    <span aria-hidden className="text-accent transition-transform duration-300 group-hover:translate-x-1">
                      &rarr;
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>

        <form onSubmit={onSubmit} className="relative mt-9 max-w-[56rem] md:mt-10" aria-label="Or tell the Director who you are">
          <label htmlFor="director-input" className="label mb-3 block">
            Or type who you are
          </label>
          <div
            className="relative border-b border-hairline-strong pb-3 transition-colors duration-300 focus-within:border-accent"
            style={{ fontSize: "clamp(1.125rem, 2.4vw, 1.75rem)", lineHeight: 1.2 }}
          >
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
              placeholder="Who you are, or what you want"
              className="director-input w-full bg-transparent text-[1em] font-medium leading-[inherit] tracking-[-0.025em] text-ink outline-none placeholder:text-muted/50 disabled:opacity-40"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-x-6 gap-y-3">
            <p className="label pointer-coarse:hidden">
              <span className="text-accent">Enter</span> to begin <span className="mx-2 text-dim">/</span>{" "}
              <span className="text-accent">Esc</span> to stop
            </p>
            <div className="ml-auto flex items-center gap-4">
              <VoiceToggle />
              <button
                type="submit"
                disabled={empty || running}
                className="label link text-ink transition-opacity disabled:pointer-events-none disabled:opacity-30"
              >
                Begin &rarr;
              </button>
            </div>
          </div>
        </form>

        <p className="mt-7 max-w-[60ch] text-[0.8125rem] leading-relaxed text-muted">
          {live
            ? "A tool-calling model plans each tour live, and speaks lines I recorded."
            : "This is a scripted tour. The live version, a tool-calling model, is offline for now."}
        </p>
      </div>

      <DirectorHud state={state} onCut={cut} onAnotherTake={anotherTake} />
    </section>
  );
}
