"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { lockScroll } from "@/components/chrome/scroll-lock";
import { assetUrl } from "@/lib/asset";
import { prefersReducedMotion } from "@/lib/motion";
import { REEL, VERTICAL_QUERY } from "./reel";
import { TRANSCRIPT, TRANSCRIPT_INTRO } from "./transcript";

const CLOSE_MS = 280;
/** Height the header and transcript summary take, so the video never pushes them off screen. */
const CHROME_PX = 280;

/** 0:07 style clock. */
const clock = (t: number) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}`;

const CSS = `
.reel-dlg { position: fixed; inset: 0; width: 100vw; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0;
  border: 0; background: transparent; color: var(--color-ink); overflow: hidden; text-shadow: none; }
.reel-dlg::backdrop { background: var(--color-void); opacity: 0; transition: opacity ${CLOSE_MS}ms var(--ease-out-expo); }
.reel-dlg[open]::backdrop { opacity: 1; }
/* The site hides the native cursor for its own ring, which sits behind a modal dialog: give it back here. */
.reel-dlg, .reel-dlg * { cursor: auto !important; }
.reel-dlg button, .reel-dlg summary, .reel-dlg video, .reel-dlg input[type="range"] { cursor: pointer !important; }
.reel-stage { position: absolute; inset: 0; overflow-y: auto; overscroll-behavior: contain; display: flex; flex-direction: column; align-items: center;
  gap: 16px; padding: max(20px, env(safe-area-inset-top)) var(--gutter) max(28px, env(safe-area-inset-bottom)); }
.reel-bar { width: 100%; max-width: var(--maxw); display: flex; align-items: center; justify-content: space-between; gap: 16px; flex: none; }
.reel-title { margin: 0; font-weight: 400; }
.reel-close { color: var(--color-ink); border: 1px solid var(--color-hairline-strong); border-radius: 2px; padding: 10px 14px; min-height: 40px;
  background: rgb(6 5 9 / 0.6); transition: border-color .25s, color .25s; }
.reel-close:hover { border-color: var(--color-accent); color: var(--color-accent-hot); }
.reel-col { flex: none; width: min(100%, calc((100dvh - ${CHROME_PX}px) * 16 / 9)); }
.reel-col[data-vertical] { width: min(100%, calc((100dvh - ${CHROME_PX}px) * 9 / 16)); }
.reel-frame { width: 100%; aspect-ratio: 16 / 9; background: var(--color-void);
  box-shadow: 0 30px 120px -30px rgb(139 123 255 / 0.35), 0 0 0 1px var(--color-hairline); border-radius: 3px; overflow: hidden;
  opacity: 0; transform: scale(0.97) translateY(8px); transition: opacity 600ms var(--ease-out-expo), transform 800ms var(--ease-out-expo); }
.reel-frame[data-vertical] { aspect-ratio: 9 / 16; }
.reel-video { display: block; width: 100%; height: 100%; object-fit: contain; background: var(--color-void); }
.reel-dlg[data-state="open"] .reel-frame { opacity: 1; transform: none; }
.reel-dlg[data-state="closing"] .reel-frame { opacity: 0; transition-duration: ${CLOSE_MS}ms; }
/* Custom control bar sits BELOW the video, so it never covers the reel's baked-in lower thirds. */
.reel-player { width: 100%; }
.reel-player:fullscreen { display: flex; flex-direction: column; justify-content: center; gap: 12px; padding: 16px; background: var(--color-void); }
.reel-player:fullscreen .reel-frame { flex: 1 1 0; min-height: 0; aspect-ratio: auto; }
.reel-ctl { display: flex; align-items: center; gap: 10px; margin-top: 10px; }
.reel-btn { flex: none; min-width: 44px; min-height: 44px; padding: 0 12px; color: var(--color-ink); background: none; border: 1px solid var(--color-hairline-strong);
  border-radius: 2px; transition: border-color .25s, color .25s; }
.reel-btn:hover { border-color: var(--color-accent); color: var(--color-accent-hot); }
.reel-btn:focus-visible, .reel-scrub:focus-visible, .reel-close:focus-visible { outline: 2px solid var(--color-accent-hot); outline-offset: 2px; }
.reel-time { flex: none; min-width: 7.5ch; text-align: center; color: var(--color-muted); font-variant-numeric: tabular-nums; }
.reel-scrub { flex: 1 1 auto; min-width: 0; height: 44px; margin: 0; background: transparent; -webkit-appearance: none; appearance: none; --p: 0%; }
.reel-scrub::-webkit-slider-runnable-track { height: 3px; border-radius: 2px; background: linear-gradient(to right, var(--color-accent-hot) var(--p), var(--color-hairline-strong) var(--p)); }
.reel-scrub::-moz-range-track { height: 3px; border-radius: 2px; background: var(--color-hairline-strong); }
.reel-scrub::-moz-range-progress { height: 3px; border-radius: 2px; background: var(--color-accent-hot); }
.reel-scrub::-webkit-slider-thumb { -webkit-appearance: none; width: 14px; height: 14px; margin-top: -5.5px; border-radius: 50%; background: var(--color-ink); border: 0; }
.reel-scrub::-moz-range-thumb { width: 14px; height: 14px; border-radius: 50%; background: var(--color-ink); border: 0; }
@media (max-width: 560px) {
  .reel-ctl { flex-wrap: wrap; row-gap: 0; }
  .reel-time { order: 1; }
  .reel-ctl .reel-btn:last-child { order: 2; }
  .reel-scrub { order: -1; flex: 1 1 100%; }
  .reel-time { margin-left: auto; }
}
.reel-tx { margin-top: 8px; max-width: 52rem; }
.reel-tx summary { list-style: none; display: inline-flex; align-items: center; gap: 8px; min-height: 40px; color: var(--color-muted); }
.reel-tx summary::-webkit-details-marker { display: none; }
.reel-tx summary:hover { color: var(--color-accent-hot); }
.reel-tx[open] summary .reel-plus { transform: rotate(45deg); }
.reel-plus { display: inline-block; transition: transform .25s var(--ease-out-expo); }
.reel-tx-body { margin-top: 8px; font-size: 0.9375rem; line-height: 1.55; color: var(--color-muted); }
.reel-tx-body dt { margin-top: 18px; color: var(--color-ink); font-weight: 500; }
.reel-tx-body dd { margin: 4px 0 0; }
.reel-tx-body .label { display: inline; margin-right: 8px; color: var(--color-accent-hot); }
@media (prefers-reduced-motion: reduce) {
  .reel-dlg *, .reel-dlg::backdrop { transition: none !important; }
  .reel-frame { transform: none; }
}
`;

type ReelModalProps = { open: boolean; onClose: () => void };

const noopSubscribe = () => () => undefined;
const useIsClient = () =>
  useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );

/** A phone held upright gets the vertical cut; follows rotation while the dialog is open. */
function useIsVertical() {
  return useSyncExternalStore(
    (notify) => {
      const mq = window.matchMedia(VERTICAL_QUERY);
      mq.addEventListener("change", notify);
      return () => mq.removeEventListener("change", notify);
    },
    () => window.matchMedia(VERTICAL_QUERY).matches,
    () => false,
  );
}

/**
 * Full-screen reel player. A native modal <dialog> gives a real dialog role, an inert page and Esc;
 * this adds the pieces it does not: an animated exit, Lenis paused while open, a Tab loop that stays
 * inside the dialog, focus handed back to whatever opened it, and autoplay with sound (the open is
 * always the result of a click, so the browser allows it). Phones held upright get the 9:16 cut.
 */
export function ReelModal({ open, onClose }: ReelModalProps) {
  const dlg = useRef<HTMLDialogElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const unlock = useRef<(() => void) | null>(null);
  const mounted = useIsClient();
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const player = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const vertical = useIsVertical();
  const source = vertical ? REEL.vertical : REEL.landscape;
  const titleId = useId();
  const transcriptId = useId();

  const finish = useCallback(() => {
    const el = dlg.current;
    video.current?.pause();
    if (el?.open) el.close();
    unlock.current?.();
    unlock.current = null;
    setState("closed");
    setPlaying(false);
    setTime(0);
    returnTo.current?.focus({ preventScroll: true });
    returnTo.current = null;
    onClose();
  }, [onClose]);

  const togglePlay = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => undefined);
    else el.pause();
  };
  const toggleMute = () => {
    const el = video.current;
    if (!el) return;
    el.muted = !el.muted;
    setMuted(el.muted);
  };
  const seek = (t: number) => {
    const el = video.current;
    if (!el) return;
    el.currentTime = t;
    setTime(t);
  };
  const fullscreen = () => {
    const host = player.current;
    const el = video.current as (HTMLVideoElement & { webkitEnterFullscreen?: () => void }) | null;
    if (document.fullscreenElement) void document.exitFullscreen();
    else if (host?.requestFullscreen) void host.requestFullscreen().catch(() => undefined);
    else el?.webkitEnterFullscreen?.();
  };

  const requestClose = useCallback(() => {
    if (state === "closing") return;
    if (prefersReducedMotion()) return finish();
    setState("closing");
    window.setTimeout(finish, CLOSE_MS);
  }, [state, finish]);

  // Open: pick the cut, show the dialog, pause the smooth scroll.
  useEffect(() => {
    const el = dlg.current;
    if (!open || !mounted || !el || el.open) return;
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el.showModal();
    unlock.current = lockScroll();
    const raf = requestAnimationFrame(() => {
      setState("open");
      video.current?.play().catch(() => undefined); // blocked autoplay leaves the native play button
    });
    return () => cancelAnimationFrame(raf);
  }, [open, mounted]);

  // Esc fires `cancel`: animate out instead of the native instant close.
  useEffect(() => {
    const el = dlg.current;
    if (!el) return;
    const onCancel = (e: Event) => {
      e.preventDefault();
      requestClose();
    };
    el.addEventListener("cancel", onCancel);
    return () => el.removeEventListener("cancel", onCancel);
  }, [mounted, requestClose]);

  // A lock must never outlive the component.
  useEffect(
    () => () => {
      unlock.current?.();
      unlock.current = null;
    },
    [],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("button, summary, input[type='range']")).filter(
      (n) => n.offsetParent !== null,
    );
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!mounted) return null;

  return createPortal(
    <dialog
      ref={dlg}
      className="reel-dlg"
      data-state={state}
      aria-modal="true"
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        // A click on the empty stage (not the video, transcript or buttons) closes.
        const t = e.target as HTMLElement;
        if (t === e.currentTarget || t.classList.contains("reel-stage")) requestClose();
      }}
    >
      <style>{CSS}</style>
      <div className="reel-stage" data-lenis-prevent>
        <div className="reel-bar">
          <h2 id={titleId} className="label reel-title">
            Showreel <span aria-hidden>/</span> {REEL.durationLabel}
          </h2>
          <button type="button" className="label reel-close" onClick={requestClose} autoFocus>
            Close <span aria-hidden>Esc</span>
          </button>
        </div>
        <div className="reel-col" data-vertical={vertical || undefined}>
          <div ref={player} className="reel-player">
          <div className="reel-frame" data-vertical={vertical || undefined}>
            {open && (
              <video
                ref={video}
                className="reel-video"
                src={assetUrl(source.src)}
                poster={assetUrl(source.poster)}
                width={source.width}
                height={source.height}
                autoPlay
                playsInline
                preload="auto"
                aria-label={REEL.title}
                aria-describedby={transcriptId}
                onClick={togglePlay}
                onPlay={() => setPlaying(true)}
                onPause={() => setPlaying(false)}
                onVolumeChange={(e) => setMuted(e.currentTarget.muted)}
                onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
                onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              />
            )}
          </div>
          <div className="reel-ctl" role="group" aria-label="Reel controls">
            <button type="button" className="label reel-btn" onClick={togglePlay} aria-label={playing ? "Pause reel" : "Play reel"}>
              {playing ? "Pause" : "Play"}
            </button>
            <button type="button" className="label reel-btn" onClick={toggleMute} aria-pressed={muted} aria-label={muted ? "Unmute reel" : "Mute reel"}>
              {muted ? "Muted" : "Sound"}
            </button>
            <input
              type="range"
              className="reel-scrub"
              min={0}
              max={duration || 1}
              step={1}
              value={Math.min(time, duration || 1)}
              onChange={(e) => seek(Number(e.target.value))}
              style={{ ["--p" as string]: `${duration ? (time / duration) * 100 : 0}%` }}
              aria-label="Seek"
              aria-valuetext={`${clock(time)} of ${clock(duration)}`}
            />
            <span className="label reel-time" aria-hidden>
              {clock(time)} / {duration ? clock(duration) : REEL.durationLabel}
            </span>
            <button type="button" className="label reel-btn" onClick={fullscreen} aria-label="Toggle full screen">
              Full
            </button>
          </div>
          </div>
          <details className="reel-tx">
            <summary className="label">
              Transcript{" "}
              <span aria-hidden className="reel-plus">
                +
              </span>
            </summary>
            <div id={transcriptId} className="reel-tx-body">
              <p>{TRANSCRIPT_INTRO}</p>
              <dl>
                {TRANSCRIPT.map((t) => (
                  <div key={t.time}>
                    <dt>
                      <span className="label">{t.time}</span>
                      {t.title}
                    </dt>
                    {t.lowerThird && <dd>Lower third: {t.lowerThird}</dd>}
                    {t.onScreen && <dd>On screen: {t.onScreen}</dd>}
                    <dd>{t.visual}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </details>
        </div>
      </div>
    </dialog>,
    document.body,
  );
}
