import type { ChapterId, FormationId } from "@/lib/director/protocol";

export type ChapterLook = {
  brightness: number;
  /** Horizontal shift as a fraction of viewport width (desktop only), +right. */
  x: number;
  /** Vertical shift as a fraction of viewport height (desktop only), +up. */
  y: number;
  /** World units pushed away from the camera (smaller, calmer). */
  z: number;
  scale: number;
};

/**
 * Per-chapter tuning so particles stay out of the way of typography.
 * Offsets are screen-space fractions, so they hold across aspect ratios.
 * Everything interpolates with the scrubbed morph.
 */
export const CHAPTER_LOOK: Record<ChapterId, ChapterLook> = {
  hero: { brightness: 0.9, x: 0, y: 0.03, z: 0, scale: 1 },
  origin: { brightness: 0.85, x: 0.22, y: 0, z: 0, scale: 0.85 },
  systems: { brightness: 0.9, x: 0, y: 0, z: 0, scale: 1 },
  work: { brightness: 0.35, x: 0, y: 0, z: -3, scale: 1.25 },
  impact: { brightness: 0.55, x: 0, y: -0.32, z: 0, scale: 1 },
  proof: { brightness: 0.6, x: 0.16, y: 0.08, z: 0, scale: 0.88 },
  director: { brightness: 0.35, x: 0, y: 0, z: -1, scale: 1.1 },
  human: { brightness: 0.9, x: 0, y: 0, z: 0, scale: 1 },
  contact: { brightness: 1, x: 0, y: 0, z: 0, scale: 1 },
};

/**
 * Phones (portrait, narrow): everything stays centered but smaller and calmer, nudged vertically
 * so the formation sits in the gaps between text blocks instead of under the body copy.
 */
export const CHAPTER_LOOK_MOBILE: Record<ChapterId, ChapterLook> = {
  hero: { brightness: 0.85, x: 0, y: 0, z: 0, scale: 1 },
  origin: { brightness: 0.4, x: 0, y: 0, z: 0, scale: 0.75 },
  systems: { brightness: 0.4, x: 0, y: 0, z: 0, scale: 0.75 },
  work: { brightness: 0.3, x: 0, y: 0, z: -3, scale: 1 },
  impact: { brightness: 0.4, x: 0, y: -0.2, z: 0, scale: 0.75 },
  proof: { brightness: 0.4, x: 0, y: 0, z: 0, scale: 0.75 },
  director: { brightness: 0.4, x: 0, y: 0, z: -1, scale: 0.75 },
  human: { brightness: 0.6, x: 0, y: 0.12, z: 0, scale: 0.6 },
  contact: { brightness: 1, x: 0, y: 0, z: 0, scale: 1 },
};

/** Shown when the route has no chapters (case studies): a dim, calm drift. */
export const NO_CHAPTER_LOOK: ChapterLook = { brightness: 0.28, x: 0, y: 0, z: -3, scale: 1.25 };

/** fit: world half-width that must stay on screen (portrait phones pull the camera back for it).
 * size: sprite size multiplier; alpha: per-point opacity. Dense formations get lower alpha. */
export const FORMATION_LOOK: Record<FormationId, { size: number; alpha: number; fog: number; fit: number }> = {
  noise: { size: 1, alpha: 0.2, fog: 0.09, fit: 3.2 },
  signal: { size: 0.31, alpha: 0.8, fog: 0.05, fit: 1.2 },
  globe: { size: 0.85, alpha: 0.26, fog: 0.09, fit: 2.15 },
  network: { size: 0.85, alpha: 0.32, fog: 0.09, fit: 2.85 },
  crowd: { size: 0.55, alpha: 0.6, fog: 0.3, fit: 3.0 },
  constellation: { size: 0.85, alpha: 0.32, fog: 0.09, fit: 2.6 },
  crosshair: { size: 0.85, alpha: 0.3, fog: 0.09, fit: 1.8 },
  singularity: { size: 0.75, alpha: 0.08, fog: 0.09, fit: 1.1 },
};

export const OVERRIDE_LOOK = { size: 0.8, alpha: 0.3, brightness: 0.95, fit: 2.6, fog: 0.09 };
