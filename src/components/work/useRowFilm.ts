"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Hover films start this far in, past the title card, on the first UI moment. */
const FILM_START = 2;
/** The film only starts after this much dwell, so sweeping the pointer down the list fetches nothing. */
const FILM_INTENT_MS = 250;

const saveData = () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

/**
 * Plays a project's launch film inside its in-row media frame while the row is active. One muted decorative
 * <video> is created lazily on the first dwell (never preloaded), fades in once it is really playing
 * (`data-live`), and is paused again when the row goes quiet. Does nothing unless `enabled`.
 */
export function useRowFilm(frame: RefObject<HTMLElement | null>, src: string | undefined, active: boolean, enabled: boolean) {
  const video = useRef<HTMLVideoElement | null>(null);
  /** True only while the row is still active, so a late `playing` event never shows a film on a row that has gone quiet. */
  const wanted = useRef(false);

  useEffect(() => {
    const host = frame.current;
    if (!host || !src || !enabled || !active || saveData()) return;
    wanted.current = true;
    const timer = window.setTimeout(() => {
      let film = video.current;
      if (!film) {
        film = document.createElement("video");
        film.muted = true;
        film.playsInline = true;
        film.preload = "none";
        film.tabIndex = -1;
        film.disablePictureInPicture = true;
        film.setAttribute("aria-hidden", "true");
        film.addEventListener("loadedmetadata", () => {
          film!.currentTime = FILM_START;
        });
        film.addEventListener("playing", () => {
          if (!wanted.current) {
            film!.pause();
            return;
          }
          film!.setAttribute("data-live", "");
        });
        // Loop back to the first UI moment, not the title card.
        film.addEventListener("ended", () => {
          film!.currentTime = FILM_START;
          void film!.play().catch(() => {});
        });
        film.src = src;
        host.appendChild(film);
        video.current = film;
      } else if (film.readyState > 0) {
        film.currentTime = FILM_START;
      }
      void film.play().catch(() => {});
    }, FILM_INTENT_MS);
    return () => {
      wanted.current = false;
      window.clearTimeout(timer);
      const film = video.current;
      if (film) {
        film.pause();
        film.removeAttribute("data-live");
      }
    };
  }, [frame, src, active, enabled]);

  // Drop the element with the row.
  useEffect(
    () => () => {
      video.current?.remove();
      video.current = null;
    },
    [],
  );
}
