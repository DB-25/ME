"use client";

import { createStore } from "zustand/vanilla";
import { useStore } from "zustand";
import type { ChapterId, FormationId } from "@/lib/director/protocol";

/**
 * Shared state between the DOM and the particle field.
 * - The scroll controller writes `chapter` + `morph`.
 * - The Director writes `override`, `hue`, `energy`.
 * - The field reads everything every frame via `signalStore.getState()`
 *   (never subscribe inside the render loop).
 */
export type SignalOverride =
  | { kind: "formation"; id: FormationId }
  | { kind: "points"; points: Float32Array; label: string };

export type SignalState = {
  chapter: ChapterId;
  /** 0..1 progress of the morph from the previous chapter's formation into the current one. */
  morph: number;
  override: SignalOverride | null;
  hue: string | null;
  /** 0..1 extra turbulence, e.g. pulsed while the Director streams tokens. */
  energy: number;
  /** True once the preloader has finished. */
  ready: boolean;
  set: (patch: Partial<Omit<SignalState, "set">>) => void;
};

export const signalStore = createStore<SignalState>((set) => ({
  chapter: "hero",
  morph: 1,
  override: null,
  hue: null,
  energy: 0,
  ready: false,
  set: (patch) => set(patch),
}));

export function useSignal<T>(selector: (s: SignalState) => T): T {
  return useStore(signalStore, selector);
}
