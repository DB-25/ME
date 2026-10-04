/**
 * What the About chapter tells the globe. Written by the origin section as its beat changes, read by the
 * field every frame (no subscription in the render loop), like `fieldMotion`.
 *
 * `focus` is the city that should face the viewer; `arc` is whether the Bangalore to Boston arc is drawn.
 * `null` focus means no story is running (Director-held globe, a route without the chapter): the globe
 * shows its default view, both cities and the whole arc.
 */
export type GlobeCity = "bangalore" | "boston";
export type GlobeStory = { focus: GlobeCity | null; arc: boolean };

export const globeStory: GlobeStory = { focus: null, arc: false };

type Listener = () => void;
const listeners = new Set<Listener>();

/** Sets the story; passing nothing (or null) ends it. Wakes any on-demand renderer. */
export function setGlobeStory(next: GlobeStory | null) {
  const focus = next ? next.focus : null;
  const arc = next ? next.arc : false;
  if (focus === globeStory.focus && arc === globeStory.arc) return;
  globeStory.focus = focus;
  globeStory.arc = arc;
  listeners.forEach((l) => l());
}

/** For the field: called when the story changes. Returns an unsubscribe. */
export function onGlobeStory(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
