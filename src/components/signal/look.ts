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
  /** 0..1 attenuation toward the right edge, so copy over the field stays legible. */
  rightDim: number;
};

/**
 * Per-chapter tuning so particles stay out of the way of typography.
 * Offsets are screen-space fractions, so they hold across aspect ratios.
 * Everything interpolates with the scrubbed morph.
 */
export const CHAPTER_LOOK: Record<ChapterId, ChapterLook> = {
  hero: { brightness: 0.8, x: 0, y: 0.03, z: 0, scale: 1, rightDim: 0.4 },
  origin: { brightness: 0.85, x: 0.22, y: 0, z: 0, scale: 0.85, rightDim: 0 },
  systems: { brightness: 0.45, x: 0.28, y: 0, z: 0, scale: 1, rightDim: 0 },
  work: { brightness: 0.22, x: 0, y: 0, z: -5, scale: 1.25, rightDim: 0 },
  impact: { brightness: 0.42, x: 0, y: -0.32, z: 0, scale: 1, rightDim: 0 },
  proof: { brightness: 0.55, x: 0.22, y: 0.14, z: 0, scale: 1, rightDim: 0 },
  director: { brightness: 0.26, x: 0, y: 0, z: -1, scale: 1.1, rightDim: 0 },
  human: { brightness: 0.9, x: 0.2, y: 0, z: 0, scale: 0.7, rightDim: 0 },
  contact: { brightness: 1.8, x: 0, y: 0, z: 0, scale: 1, rightDim: 0 },
};

/** Phones: where the dense chapters pin their formation, as a screen fraction above centre: the middle of the top 38% of the viewport. */
const PIN_Y = 0.31;

/**
 * Phones (portrait, narrow): everything stays centered but smaller and calmer, nudged vertically
 * so the formation sits in the gaps between text blocks instead of under the body copy.
 */
export const CHAPTER_LOOK_MOBILE: Record<ChapterId, ChapterLook> = {
  hero: { brightness: 0.85, x: 0, y: 0, z: 0, scale: 1, rightDim: 0 },
  origin: { brightness: 0.95, x: 0, y: PIN_Y, z: 0, scale: 0.5, rightDim: 0 },
  systems: { brightness: 1.6, x: 0, y: PIN_Y, z: 0, scale: 1, rightDim: 0 },
  work: { brightness: 0.3, x: 0, y: 0, z: -3, scale: 1, rightDim: 0 },
  impact: { brightness: 1.1, x: 0, y: 0.2, z: 0, scale: 0.9, rightDim: 0 },
  proof: { brightness: 0.55, x: 0, y: 0, z: 0, scale: 1, rightDim: 0 },
  director: { brightness: 0.3, x: 0, y: 0, z: -1, scale: 0.75, rightDim: 0 },
  human: { brightness: 1.1, x: 0, y: PIN_Y, z: 0, scale: 0.42, rightDim: 0 },
  contact: { brightness: 1, x: 0, y: 0, z: 0, scale: 1, rightDim: 0 },
};

/** Shown when the route has no chapters (case studies): a dim, calm drift. */
export const NO_CHAPTER_LOOK: ChapterLook = { brightness: 0.28, x: 0, y: 0, z: -3, scale: 1.25, rightDim: 0 };

export type FormationSprite = { size: number; alpha: number; fog: number; fit: number; density: number; spark: number };

/** fit: world half-width that must stay on screen (portrait phones pull the camera back for it).
 * size: sprite size multiplier; alpha: per-point opacity. Dense formations get lower alpha. */
export const FORMATION_LOOK: Record<FormationId, FormationSprite> = {
  noise: { size: 0.9, alpha: 0.2, fog: 0.09, fit: 3.2, density: 0.45, spark: 0.2 },
  signal: { size: 0.31, alpha: 0.8, fog: 0.05, fit: 1.2, density: 1, spark: 0.8 },
  globe: { size: 0.68, alpha: 0.32, fog: 0.09, fit: 2.15, density: 1, spark: 0.5 },
  network: { size: 0.85, alpha: 0.32, fog: 0.09, fit: 2.85, density: 1, spark: 0.4 },
  crowd: { size: 0.5, alpha: 0.42, fog: 0.3, fit: 3.0, density: 0.45, spark: 0.25 },
  constellation: { size: 0.8, alpha: 0.27, fog: 0.09, fit: 2.6, density: 0.65, spark: 0.35 },
  crosshair: { size: 0.5, alpha: 0.2, fog: 0.09, fit: 1.8, density: 1, spark: 0.15 },
  singularity: { size: 0.75, alpha: 0.08, fog: 0.09, fit: 1.1, density: 1, spark: 0.5 },
};

/**
 * The Contact frame around the address: fine, bright sprites on a thinned band (density), crisp rather than glowing.
 * fit 1.0 keeps the camera at its base distance, where one world unit is a known number of pixels, so the band lines
 * up with the DOM letters (see emailFormation.ts).
 */
export const EMAIL_SPRITE: FormationSprite = { size: 0.62, alpha: 1, fog: 0.02, fit: 1, density: 0.5, spark: 0.12 };

/** Phones: the address is about 30px tall, so the band is thinner and every sprite smaller and dimmer. */
export const EMAIL_SPRITE_PHONE: FormationSprite = { size: 0.3, alpha: 0.8, fog: 0.02, fit: 1, density: 0.3, spark: 0.1 };

export const OVERRIDE_LOOK = { size: 0.38, alpha: 0.3, brightness: 0.95, fit: 2.6, fog: 0.09, density: 1, spark: 0.3 };

/** Bloom multiplier per chapter: hairlines (signal field, crosshair) stay crisp, glows keep the full bloom. */
export const CHAPTER_BLOOM: Partial<Record<ChapterId, number>> = { hero: 0.4, impact: 0.7, systems: 0.6, proof: 0.65, director: 0.6, origin: 0.6, human: 0.3, contact: 0.4 };
export const DEFAULT_BLOOM = 1;

/** Bloom multiplier while a Director drawing is held: line art must stay crisp, not glow. */
export const OVERRIDE_BLOOM = 0.3;
