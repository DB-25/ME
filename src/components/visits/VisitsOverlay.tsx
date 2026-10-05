"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { lockScroll } from "@/components/chrome/scroll-lock";
import { hideVisitsGlow, showVisitsGlow } from "@/components/signal/visitsGlow";
import { prefersReducedMotion } from "@/lib/motion";
import { signalStore, type SignalOverride } from "@/lib/signal-store";
import { VISITS_CLOSE_EVENT, closeVisits, getVisitsState } from "./visitsClient";
import { CSS, FADE_MS } from "./visitsStyles";

const VisitsMap = dynamic(() => import("./VisitsMap"), { ssr: false });

const TOP_COUNTRIES = 5;
const COUNT_UP_MS = 900;
/** The flare on the globe starts this long after opening (see visitsGlow.ts); the "you are here" line arrives with it. */
const YOU_LINE_DELAY_MS = 1200;

const GLOBE: SignalOverride = { kind: "formation", id: "globe" };

function countryName(code: string): string {
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}

/** Counts up to `target` once, easing out; just the number under reduced motion. */
function useCountUp(target: number, motion: boolean): number {
  const [shown, setShown] = useState(motion ? 0 : target);
  useEffect(() => {
    if (!motion) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / COUNT_UP_MS);
      setShown(Math.round(target * (1 - Math.pow(1 - t, 3))));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, motion]);
  return motion ? shown : target;
}

/**
 * The hidden visitors globe. In `globe` view it holds the particle field on its globe formation (the field's own
 * shader draws the hot spots, see signal/visitsGlow.ts) and lifts the canvas above the page; in `map` view (phones,
 * no live WebGL) it draws the light SVG dot map. Loaded on the first open only.
 */
export default function VisitsOverlay() {
  const { data, you, view } = getVisitsState();
  const root = useRef<HTMLDivElement>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const [youShown, setYouShown] = useState(false);
  const titleId = useId();
  const motion = useMemo(() => !prefersReducedMotion(), []);
  const total = useCountUp(data?.total ?? 0, motion);

  const requestClose = useCallback(() => {
    if (state === "closing") return;
    setState("closing");
    if (!motion) return closeVisits();
    window.setTimeout(closeVisits, FADE_MS);
  }, [state, motion]);

  // Fade in, take focus, freeze the page; undo all of it on the way out.
  useEffect(() => {
    returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const unlock = lockScroll();
    closeBtn.current?.focus({ preventScroll: true });
    const raf = requestAnimationFrame(() => setState("open"));
    return () => {
      cancelAnimationFrame(raf);
      unlock();
      returnTo.current?.focus({ preventScroll: true });
    };
  }, []);

  // Globe view: hold the globe formation (giving back whatever the Director held) and hand the hot spots to the field.
  useEffect(() => {
    if (view !== "globe" || !data) return;
    const previous = signalStore.getState().override;
    signalStore.getState().set({ override: GLOBE });
    showVisitsGlow({ cells: data.cells, you: you ? { lat: you.lat, lon: you.lon } : null, motion });
    return () => {
      hideVisitsGlow();
      if (signalStore.getState().override === GLOBE) signalStore.getState().set({ override: previous });
    };
  }, [view, data, you, motion]);

  useEffect(() => {
    if (!you) return;
    const id = window.setTimeout(() => setYouShown(true), motion ? YOU_LINE_DELAY_MS : 0);
    return () => window.clearTimeout(id);
  }, [you, motion]);

  // Esc closes (and is ours alone while the egg is up); `v` again asks through the event; Tab stays on the one control.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        requestClose();
      } else if (e.key === "Tab") {
        e.preventDefault();
        closeBtn.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener(VISITS_CLOSE_EVENT, requestClose);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener(VISITS_CLOSE_EVENT, requestClose);
    };
  }, [requestClose]);

  if (!data) return null;
  const top = data.countries.slice(0, TOP_COUNTRIES);

  return (
    <div ref={root} className="ve" role="dialog" aria-modal="true" aria-labelledby={titleId} data-state={state} data-view={view}>
      <style>{CSS}</style>
      <div>
        <div className="ve-head">
          <p className="label ve-eyebrow">
            <span id={titleId}>Visitors</span>
            {data.demo && <span className="label ve-demo !text-[11px]">demo data</span>}
          </p>
          <button ref={closeBtn} type="button" className="label ve-close" onClick={requestClose}>
            close (esc)
          </button>
        </div>
        <span className="ve-total num" aria-live="off">
          {total.toLocaleString("en-US")}
        </span>
        <p className="ve-lede">
          {data.demo ? "Invented sample places, for development only. " : ""}
          Everyone who stopped by, from {data.countries.length.toLocaleString("en-US")} {data.countries.length === 1 ? "country" : "countries"}. Brighter means more.
        </p>
        {top.length > 0 && (
          <ul className="ve-countries" aria-label="Top countries">
            {top.map(([code, n]) => (
              <li key={code}>
                <b className="num">{n.toLocaleString("en-US")}</b>
                {countryName(code)}
              </li>
            ))}
          </ul>
        )}
        {you && (
          <p className="ve-you label !text-[12px]" data-on={youShown}>
            <i aria-hidden />
            You are here{you.country ? `: ${countryName(you.country)}` : ""}
          </p>
        )}
      </div>

      {view === "map" && (
        <div className="ve-map">
          <VisitsMap cells={data.cells} you={you} motion={motion} />
        </div>
      )}

      <p className="label ve-privacy !text-[12px]">Counts only: a coarse location from Cloudflare, no IPs stored.</p>
    </div>
  );
}
