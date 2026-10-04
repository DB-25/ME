"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Project } from "@/content";
import { prefersReducedMotion } from "@/lib/motion";
import { assetUrl } from "../asset";

/** Phones get the 9:16 cut. Keep in sync with the `.cs-film-frame[data-vertical]` media query in case.css. */
const PHONE_QUERY = "(max-width: 767px)";
/** The film starts loading this far before it scrolls into view. */
const NEAR_PX = 200;

/**
 * The project's launch film, right under the title sequence. Plays muted while on screen (never under
 * reduced motion, never with sound) with explicit pause and sound buttons so autoplay is always
 * stoppable (WCAG 2.2.2). A transcript sits under it for anyone who can't watch.
 * The source is chosen once at mount (vertical on phones, landscape elsewhere): never both.
 */
export function CaseFilm({ project }: { project: Project }) {
  const film = project.film;
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  // The still stays up until the first frame is really playing, so a slow start never shows a black box.
  const [started, setStarted] = useState(false);
  const [showText, setShowText] = useState(false);
  const [muted, setMuted] = useState(true);
  const userPaused = useRef(false);
  const transcriptId = useId();
  const hasVertical = Boolean(film?.vertical);
  const still = useRef<HTMLImageElement>(null);

  // Pick the source once, at mount (vertical on phones, landscape elsewhere), but fetch nothing until the frame
  // is within NEAR_PX of the viewport: the film sits below the fold, so page load stays free of its ~4MB.
  useEffect(() => {
    const el = video.current;
    if (!el || !film) return;
    const tall = Boolean(film.vertical) && window.matchMedia(PHONE_QUERY).matches;
    const pick = tall && film.vertical ? film.vertical : film;
    el.preload = "none";
    if (tall && film.vertical && still.current) still.current.src = assetUrl(film.vertical.poster);

    const saveData = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
    let loaded = false;
    const load = () => {
      if (loaded) return;
      loaded = true;
      el.preload = saveData ? "metadata" : "auto";
      el.src = assetUrl(pick.src);
    };
    const near = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        load();
        near.disconnect();
      },
      { rootMargin: `${NEAR_PX}px 0px` },
    );
    near.observe(el);

    if (prefersReducedMotion()) return () => near.disconnect();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          load();
          el.play().catch(() => setPlaying(false));
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => {
      near.disconnect();
      io.disconnect();
    };
  }, [film]);

  if (!film) return null;

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) {
      userPaused.current = false;
      el.play().catch(() => setPlaying(false));
    } else {
      userPaused.current = true;
      el.pause();
    }
  };

  const toggleSound = () => {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
    if (!el.muted && el.paused) togglePlay();
  };

  return (
    <section id="sec-film" className="cs-film shell" data-cs="film" data-cs-label="Film" aria-label={film.title}>
      <div className="cs-film-frame" data-vertical={hasVertical ? "" : undefined}>
        <video
          ref={video}
          aria-label={film.title}
          aria-describedby={film.transcript ? transcriptId : undefined}
          muted
          loop
          playsInline
          preload="none"
          onPlay={() => setPlaying(true)}
          onPlaying={() => setStarted(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img ref={still} className="cs-film-still" src={assetUrl(film.thumb ?? film.poster)} alt="" data-gone={started ? "" : undefined} aria-hidden />
      </div>
      <div className="cs-film-bar">
        {film.transcript ? (
          <button
            type="button"
            className="label cs-film-btn cs-film-tx"
            aria-expanded={showText}
            aria-controls={transcriptId}
            onClick={() => setShowText((v) => !v)}
          >
            <span aria-hidden>{showText ? "\u2013" : "+"}</span> Transcript
          </button>
        ) : null}
        <div className="cs-film-controls">
          <button type="button" className="label cs-film-btn" onClick={togglePlay}>
            {playing ? "Pause" : "Play film"}
          </button>
          <button type="button" className="label cs-film-btn" onClick={toggleSound} aria-pressed={!muted}>
            Sound <span aria-hidden>{muted ? "off" : "on"}</span>
          </button>
        </div>
      </div>
      {film.transcript ? (
        <p id={transcriptId} className="cs-film-text" hidden={!showText}>
          {film.transcript}
        </p>
      ) : null}
    </section>
  );
}
