"use client";

import { useEffect, useRef, useState } from "react";
import type { Project } from "@/content";
import { prefersReducedMotion } from "@/lib/motion";
import { assetUrl } from "../asset";

/**
 * The project's launch film, right under the title sequence. Plays muted while
 * on screen (never under reduced motion), with explicit pause and sound
 * controls so autoplay is never something the visitor can't stop.
 */
export function CaseFilm({ project }: { project: Project }) {
  const film = project.film;
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const userPaused = useRef(false);

  useEffect(() => {
    const el = video.current;
    if (!el || prefersReducedMotion()) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !userPaused.current) {
          el.play().catch(() => setPlaying(false));
        } else {
          el.pause();
        }
      },
      { threshold: 0.35 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

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
    <section className="cs-film shell" aria-label={film.title}>
      <div className="cs-film-frame">
        <video
          ref={video}
          src={assetUrl(film.src)}
          poster={assetUrl(film.poster)}
          muted
          loop
          playsInline
          preload="metadata"
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
        />
        <div className="cs-film-controls">
          <button type="button" className="label cs-film-btn" onClick={togglePlay} aria-pressed={playing}>
            {playing ? "Pause" : "Play film"}
          </button>
          <button type="button" className="label cs-film-btn" onClick={toggleSound} aria-pressed={!muted}>
            {muted ? "Sound on" : "Sound off"}
          </button>
        </div>
      </div>
    </section>
  );
}
