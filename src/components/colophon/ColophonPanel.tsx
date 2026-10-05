"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { lockScroll } from "@/components/chrome/scroll-lock";
import { getFieldStatus, subscribeFieldStatus, type FieldStatus } from "@/components/signal/fieldStatus";
import { getMotionPrefs, setMotionPref, subscribeMotionPrefs } from "@/components/signal/motionPrefs";
import { prefersReducedMotion } from "@/lib/motion";
import { CHART_MAX_MS, useFrameTimes } from "./useFrameTimes";
import { formatBytes, measureScripts, type ScriptDelivery } from "./delivery";
import { CLOSE_MS, CSS } from "./panelStyles";
import { STACK } from "./stack";
import { getVitals, rate, startVitals, subscribeVitals, type Rating, type VitalName } from "./vitals";

const SERVER_PREFS = { paused: false, still: false };
const FRAME_BUDGET_MS = 1000 / 60;
/** How often the script total is re-read while the panel is open. */
const DELIVERY_REFRESH_MS = 2000;

function useStore<T>(subscribe: (cb: () => void) => () => void, get: () => T, server: T): T {
  return useSyncExternalStore(subscribe, get, () => server);
}

function useMotionPrefs() {
  return useSyncExternalStore(
    (cb) => subscribeMotionPrefs(cb),
    getMotionPrefs,
    () => SERVER_PREFS,
  );
}

type VitalCell = { name: VitalName; label: string; text: string; unit: string; rating: Rating | null; caption: string };

function vitalCells(v: ReturnType<typeof getVitals>): VitalCell[] {
  const cell = (name: VitalName, label: string, value: number | null, format: (n: number) => [string, string], waiting: string): VitalCell => {
    if (!v.supported[name]) return { name, label, text: "n/a", unit: "", rating: null, caption: "not in this browser" };
    if (value === null) return { name, label, text: "--", unit: "", rating: null, caption: waiting };
    const [text, unit] = format(value);
    return { name, label, text, unit, rating: rate(name, value), caption: rate(name, value) };
  };
  return [
    cell("lcp", "LCP", v.lcp, (n) => [(n / 1000).toFixed(2), "s"], "measuring"),
    cell("cls", "CLS", v.cls, (n) => [n.toFixed(3), ""], "measuring"),
    cell("inp", "INP", v.inp, (n) => [String(Math.round(n)), "ms"], "tap something"),
  ];
}

function modeText(f: FieldStatus): string {
  if (f.mode === "live") return "Live 3D";
  if (f.mode === "poster") return f.reason ? `Still image (${f.reason})` : "Still image";
  return f.lean ? "Still image until your first touch" : "Starting";
}

function tierText(f: FieldStatus): string {
  if (!f.count) return "--";
  const size = f.count >= 96_000 ? "Full" : "Light";
  const bloom = f.lean ? "bloom in the point shader" : "bloom pass";
  return `${size}: ${f.count.toLocaleString("en-US")} particles, ${bloom}`;
}

function drawingText(f: FieldStatus): string {
  if (f.mode !== "live" || !f.count) return "Nothing: the field is not running";
  const shed = f.activeCount < f.count ? " (adaptive quality shed some to hold frame rate)" : "";
  return `${f.activeCount.toLocaleString("en-US")} of ${f.count.toLocaleString("en-US")}${shed}`;
}

function rendererText(f: FieldStatus): string {
  if (!f.renderer) return f.mode === "live" ? "Hidden by your browser" : "Not checked, no WebGL context made";
  return f.software ? `${f.renderer} (software)` : f.renderer;
}

function dprText(f: FieldStatus): string {
  if (!f.dpr) return "Not drawn";
  const device = window.devicePixelRatio || 1;
  return f.dpr < device ? `${f.dpr}x (capped from ${device}x)` : `${f.dpr}x`;
}

function Switch({ label, description, checked, disabled, onChange }: { label: string; description: string; checked: boolean; disabled?: boolean; onChange: (next: boolean) => void }) {
  const labelId = useId();
  const descId = useId();
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-disabled={disabled || undefined}
      aria-labelledby={labelId}
      aria-describedby={descId}
      className="cx-sw"
      onClick={() => !disabled && onChange(!checked)}
    >
      <span>
        <span id={labelId} className="cx-sw-title">
          {label}
        </span>
        <span id={descId} className="cx-sw-desc">
          {description}
        </span>
      </span>
      <span className="cx-sw-state">
        <span className="label !text-[12px]" aria-hidden="true">
          {checked ? "On" : "Off"}
        </span>
        <span className="cx-track" aria-hidden="true" />
      </span>
    </button>
  );
}

type PanelProps = { open: boolean; onClose: () => void };

/**
 * The colophon: live numbers for this visit, the stack, and two motion switches. Loaded on first open only.
 * A native modal <dialog> gives the dialog role, an inert page and Esc; this adds the animated exit, a Tab loop,
 * paused smooth scroll while open, and focus handed back to whatever opened it. Wide screens get a side drawer,
 * phones a bottom sheet.
 */
export default function ColophonPanel({ open, onClose }: PanelProps) {
  const dlg = useRef<HTMLDialogElement>(null);
  const chart = useRef<HTMLCanvasElement>(null);
  const returnTo = useRef<HTMLElement | null>(null);
  const unlock = useRef<(() => void) | null>(null);
  const [state, setState] = useState<"closed" | "open" | "closing">("closed");
  const titleId = useId();
  const field = useStore(subscribeFieldStatus, getFieldStatus, getFieldStatus());
  const vitals = useStore(subscribeVitals, getVitals, getVitals());
  const prefs = useMotionPrefs();
  const [delivery, setDelivery] = useState<ScriptDelivery | null>(null);
  const [systemReduced] = useState(prefersReducedMotion);
  const frames = useFrameTimes(state !== "closed", chart);

  const finish = useCallback(() => {
    const el = dlg.current;
    if (el?.open) el.close();
    unlock.current?.();
    unlock.current = null;
    setState("closed");
    returnTo.current?.focus({ preventScroll: true });
    returnTo.current = null;
    onClose();
  }, [onClose]);

  const requestClose = useCallback(() => {
    if (state === "closing") return;
    if (prefersReducedMotion()) return finish();
    setState("closing");
    window.setTimeout(finish, CLOSE_MS);
  }, [state, finish]);

  useEffect(() => {
    const el = dlg.current;
    if (!open || !el) return;
    // Development re-runs effects: the dialog may already be up, but the entrance still has to be scheduled.
    if (!el.open) {
      startVitals();
      returnTo.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      el.showModal();
    }
    unlock.current ??= lockScroll();
    const raf = requestAnimationFrame(() => setState("open"));
    return () => cancelAnimationFrame(raf);
  }, [open]);

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
  }, [requestClose]);

  // A scroll lock must never outlive the panel.
  useEffect(
    () => () => {
      unlock.current?.();
      unlock.current = null;
    },
    [],
  );

  // Script weight is re-read while open: the 3D chunk can land after the panel does.
  const fieldMode = field.mode;
  useEffect(() => {
    if (state === "closed") return;
    const read = () => setDelivery(measureScripts());
    read();
    const id = window.setInterval(read, DELIVERY_REFRESH_MS);
    return () => window.clearInterval(id);
  }, [state, fieldMode]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLDialogElement>) => {
    if (e.key !== "Tab") return;
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>("button")).filter((n) => n.offsetParent !== null);
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

  const cells = vitalCells(vitals);
  const pausedOn = prefs.paused || systemReduced;

  return (
    <dialog
      ref={dlg}
      className="cx"
      data-state={state}
      aria-labelledby={titleId}
      onKeyDown={onKeyDown}
      onClick={(e) => {
        // A click on the dim area (the dialog itself, outside the sheet) closes.
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <style>{CSS}</style>
      <div className="cx-sheet">
        <header className="cx-head">
          <div>
            <p className="label">Colophon</p>
            <h2 id={titleId} className="cx-title">
              How this site works
            </h2>
          </div>
          <button type="button" className="label cx-close" onClick={requestClose}>
            Close <span aria-hidden className="cx-esc">Esc</span>
          </button>
        </header>

        <div className="cx-body">
          <p className="cx-lede">I measured all of this in your browser, for this visit. Nothing leaves your device.</p>

          <section className="cx-sec" aria-labelledby={`${titleId}-v`}>
            <h3 id={`${titleId}-v`} className="label">
              Core Web Vitals
            </h3>
            <dl className="cx-vitals">
              {cells.map((c) => (
                <div key={c.name}>
                  <dt className="label !text-[12px]">{c.label}</dt>
                  <dd>
                    <span className="cx-big num">
                      {c.text}
                      {c.unit && <small>{c.unit}</small>}
                    </span>
                    <span className="cx-rate label !text-[11px]" data-rating={c.rating ?? undefined}>
                      {c.caption}
                    </span>
                  </dd>
                </div>
              ))}
            </dl>
            <p className="cx-note">
              LCP is when the biggest thing painted, CLS is how much the layout moved, INP is the slowest response to a tap or key. INP only counts interactions from when this panel was first opened.
            </p>
          </section>

          <section className="cx-sec" aria-labelledby={`${titleId}-f`}>
            <h3 id={`${titleId}-f`} className="label">
              The particle field
            </h3>
            <dl className="cx-rows">
              <div>
                <dt className="label !text-[12px]">Mode</dt>
                <dd>{modeText(field)}</dd>
              </div>
              <div>
                <dt className="label !text-[12px]">Renderer</dt>
                <dd>{rendererText(field)}</dd>
              </div>
              <div>
                <dt className="label !text-[12px]">Tier</dt>
                <dd>{tierText(field)}</dd>
              </div>
              <div>
                <dt className="label !text-[12px]">Drawing</dt>
                <dd>{drawingText(field)}</dd>
              </div>
              <div>
                <dt className="label !text-[12px]">Pixel ratio</dt>
                <dd>{dprText(field)}</dd>
              </div>
            </dl>
            {field.software && (
              <p className="cx-note">This machine renders WebGL in software. I would rather show you a still than freeze your tab.</p>
            )}
            <div className="cx-switches">
              <Switch
                label="Pause motion"
                description={
                  systemReduced
                    ? "Your system already asks for reduced motion, so this is on."
                    : "The field stops moving and only crossfades between sections. Smooth scrolling turns off. Saved on this device."
                }
                checked={pausedOn}
                disabled={systemReduced}
                onChange={(next) => setMotionPref("paused", next)}
              />
              <Switch
                label="Show still instead of 3D"
                description="Skips WebGL and shows the hero still. Lightest on your battery and GPU. Saved on this device."
                checked={prefs.still}
                onChange={(next) => setMotionPref("still", next)}
              />
            </div>
          </section>

          <section className="cx-sec" aria-labelledby={`${titleId}-t`}>
            <h3 id={`${titleId}-t`} className="label">
              Frame time, live
            </h3>
            <div className="cx-chart">
              <canvas ref={chart} aria-hidden="true" />
              <div className="cx-ref" style={{ bottom: `${(FRAME_BUDGET_MS / CHART_MAX_MS) * 100}%` }} aria-hidden="true">
                <span className="label">60 fps</span>
              </div>
            </div>
            <p className="cx-read label !text-[12px] num" style={{ letterSpacing: "0.08em" }}>
              {frames ? `${frames.fps.toFixed(0)} fps, avg ${frames.avg.toFixed(1)} ms, worst ${frames.worst.toFixed(0)} ms` : "Measuring"}
            </p>
            <p className="cx-note">One bar per animation frame of this page, last 120. It runs only while this panel is open.</p>
          </section>

          <section className="cx-sec" aria-labelledby={`${titleId}-j`}>
            <h3 id={`${titleId}-j`} className="label">
              JavaScript shipped
            </h3>
            <dl className="cx-rows">
              <div>
                <dt className="label !text-[12px]">Transferred</dt>
                <dd>{delivery ? `${formatBytes(delivery.transferred)} over ${delivery.files} files` : "--"}</dd>
              </div>
            </dl>
            <p className="cx-note">
              Compressed bytes fetched since this page loaded
              {delivery && delivery.cached > 0 ? `, not counting ${delivery.cached} files your browser already had` : ""}
              {delivery?.partial ? ". Your browser stopped recording, so the real total may be higher" : ""}. The 3D field loads after first paint, so this grows when it arrives.
            </p>
          </section>

          <section className="cx-sec" aria-labelledby={`${titleId}-s`}>
            <h3 id={`${titleId}-s`} className="label">
              Stack
            </h3>
            <dl className="cx-stack">
              {STACK.map((s) => (
                <div key={s.name}>
                  <dt>
                    {s.name}
                    <span className="label !text-[12px] num">{s.version}</span>
                  </dt>
                  <dd>{s.note}</dd>
                </div>
              ))}
            </dl>
          </section>
        </div>
      </div>
    </dialog>
  );
}
