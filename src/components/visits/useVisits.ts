"use client";

import { useSyncExternalStore } from "react";
import { getVisitsServerState, getVisitsState, subscribeVisits } from "./visitsClient";

/** True once the Worker has answered with a real map (or, on localhost, the demo data was asked for). */
export function useVisitsReady(): boolean {
  return useSyncExternalStore(subscribeVisits, () => getVisitsState().status === "ready", () => getVisitsServerState().status === "ready");
}

export function useVisitsOpen(): boolean {
  return useSyncExternalStore(subscribeVisits, () => getVisitsState().open, () => false);
}

/** True while the particle field itself is the visitors globe (the canvas is lifted above the page). */
export function useVisitsGlobe(): boolean {
  return useSyncExternalStore(subscribeVisits, () => getVisitsState().open && getVisitsState().view === "globe", () => false);
}
