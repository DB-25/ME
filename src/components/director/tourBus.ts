/**
 * How the rest of the page starts a guided tour. The hero offers the three persona tours; the
 * Director chapter owns the run loop and listens here. The Director is a separate, lazily loaded
 * chunk, so a request made before it has mounted waits in `pending` and is picked up on mount.
 */

/** The three persona tours, in the order they are offered. `request` is what the matcher reads. */
export const PERSONA_TOURS = [
  { id: "founder", label: "I'm a founder", request: "I'm a founder" },
  { id: "hiring", label: "I'm hiring", request: "I'm hiring" },
  { id: "engineer", label: "I'm an engineer", request: "I'm an engineer" },
] as const;

export const TOUR_EVENT = "director:start";
export type TourRequest = { prompt: string };

let pending: string | null = null;

/** Ask the Director to play a tour. Safe to call before the Director has loaded. */
export function requestTour(prompt: string) {
  pending = prompt;
  window.dispatchEvent(new CustomEvent<TourRequest>(TOUR_EVENT, { detail: { prompt } }));
}

/** The request nobody has claimed yet, once. */
export function takePendingTour(): string | null {
  const prompt = pending;
  pending = null;
  return prompt;
}

/** The Director claimed the request from the event: nothing is left waiting. */
export function claimTour() {
  pending = null;
}

/** Start fetching the Director chunk early (hover, focus, touch) so the tour starts at once. */
export function warmDirector() {
  void import("./Director");
}
