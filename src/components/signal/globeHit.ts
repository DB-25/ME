/**
 * Where the About chapter's globe is on screen right now, in viewport px. The field writes it each frame (no
 * allocation) while that globe is the formation on show; the hidden visitors egg reads it to turn a click on the
 * globe into an open. `active` is false whenever the globe is not what the visitor is looking at.
 */
export const globeHit = { active: false, x: 0, y: 0, r: 0 };

/** True when a viewport point lies on the globe. */
export function isOnGlobe(x: number, y: number): boolean {
  return globeHit.active && Math.hypot(x - globeHit.x, y - globeHit.y) <= globeHit.r;
}
