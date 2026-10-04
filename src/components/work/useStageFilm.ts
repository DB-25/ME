"use client";

import { useEffect, useRef, type RefObject } from "react";

/** Films start this far in, past the title card, on the first UI moment. */
const FILM_START = 2;
/** The film only starts after this much dwell, so sweeping the pointer down the list fetches nothing. */
const FILM_INTENT_MS = 320;

const saveData = () => Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

/**
 * Plays the shown project's launch film over the preview stage. One muted decorative <video> is created lazily on
 * the first dwell (never preloaded), reused for every project, fades in once it is really playing (`data-live`),
 * and fades back to the still as soon as the pointer leaves or another project is chosen. Does nothing unless `enabled`.
 */
export function useStageFilm(frame: RefObject<HTMLElement | null>, src: string | undefined, enabled: boolean) {
  const video = useRef<HTMLVideoElement | null>(null);
  /** True only while this project is still wanted, so a late `playing` event never shows a stale film. */
  const wanted = useRef(false);

  useEffect(() => {
    const host = frame.current;
    if (!host || !src || !enabled || saveData()) return;
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
        host.appendChild(film);
        video.current = film;
      }
      film.removeAttribute("data-live");
      if (film.getAttribute("src") !== src) film.src = src;
      else if (film.readyState > 0) film.currentTime = FILM_START;
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
  }, [frame, src, enabled]);

  // Drop the element with the stage.
  useEffect(
    () => () => {
      video.current?.remove();
      video.current = null;
    },
    [],
  );
}
