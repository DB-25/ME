/**
 * The showreel: one 43 second cut of the six launch films, in three shapes.
 * Landscape plays on desktop, the 9:16 cut plays on phones held upright. The 4:5 cut is only
 * for posting elsewhere and is deliberately not referenced here.
 * Source of truth for the files: .brag/reel (gen.mjs) encoded into public/films.
 */
export type ReelSource = { src: string; poster: string; width: number; height: number };

export const REEL = {
  landscape: { src: "/films/reel.mp4", poster: "/films/reel.jpg", width: 1920, height: 1080 },
  vertical: { src: "/films/reel-9x16.mp4", poster: "/films/reel-9x16.jpg", width: 1080, height: 1920 },
  /** Shown in the button. Keep in step with the render. */
  durationLabel: "0:43",
  durationSpoken: "43 seconds",
  title: "Showreel, Dhruv Kamalesh Kumar",
} as const;

/** A phone held upright gets the vertical cut. */
export const VERTICAL_QUERY = "(max-width: 767px) and (orientation: portrait)";
