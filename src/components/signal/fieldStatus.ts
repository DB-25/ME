/**
 * A read-only window onto what the particle field chose for this visit. The engine, the mount and the capability
 * probe write here; the Colophon panel reads it. No React, no allocation per frame: patches replace the snapshot
 * only when a value actually changed, so a subscriber re-renders at most a few times per visit.
 */

/** `pending`: not started (phones wait for a first touch). `live`: WebGL is on screen. `poster`: a still stands in. */
export type FieldMode = "pending" | "live" | "poster";

export type FieldStatus = {
  mode: FieldMode;
  /** Why the poster is showing, in plain words. Null while live or pending. */
  reason: string | null;
  /** Unmasked GPU string, when the browser exposes it. */
  renderer: string | null;
  software: boolean;
  /** Particle budget for this device class, and how many the adaptive quality is drawing right now. */
  count: number;
  activeCount: number;
  /** The device pixel ratio the canvas is rendered at, after the cap. */
  dpr: number;
  /** Phones: bloom is approximated in the point shader instead of a postprocessing pass. */
  lean: boolean;
  reducedMotion: boolean;
};

let status: FieldStatus = {
  mode: "pending",
  reason: null,
  renderer: null,
  software: false,
  count: 0,
  activeCount: 0,
  dpr: 0,
  lean: false,
  reducedMotion: false,
};

const listeners = new Set<() => void>();

export const getFieldStatus = (): Readonly<FieldStatus> => status;

export function subscribeFieldStatus(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function patchFieldStatus(patch: Partial<FieldStatus>) {
  const changed = (Object.keys(patch) as Array<keyof FieldStatus>).some((k) => status[k] !== patch[k]);
  if (!changed) return;
  status = { ...status, ...patch };
  syncDocumentFlag();
  listeners.forEach((l) => l());
}

/**
 * `<html data-field-light>` while the page is on a still or on software GL: the compositor is already the bottleneck
 * there, so chrome that blurs or blends what is behind it (the nav bar) falls back to an opaque fill. See Nav.tsx.
 */
function syncDocumentFlag() {
  if (typeof document === "undefined") return;
  const light = status.mode === "poster" || status.software;
  const root = document.documentElement;
  if (light) root.setAttribute("data-field-light", "");
  else root.removeAttribute("data-field-light");
}
