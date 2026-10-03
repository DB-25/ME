import type { ChapterId, FormationId } from "@/lib/director/protocol";

/**
 * Per-chapter brightness (0..1.2) and per-formation sprite look.
 * Work is dimmed so the project cards read; Director stays calm under the input.
 */
export const CHAPTER_BRIGHTNESS: Record<ChapterId, number> = {
  hero: 1,
  origin: 1,
  systems: 1,
  work: 0.34,
  impact: 0.95,
  proof: 1,
  director: 0.6,
  human: 1,
  contact: 1,
};

/** fit: world half-width that must stay on screen (portrait phones pull the camera back for it).
 * size: sprite size multiplier; alpha: per-point opacity. Dense formations get lower alpha. */
export const FORMATION_LOOK: Record<FormationId, { size: number; alpha: number; offsetX: number; fit: number }> = {
  noise: { size: 1, alpha: 0.2, offsetX: 0, fit: 3.2 },
  monogram: { size: 0.9, alpha: 0.28, offsetX: 0, fit: 1.9 },
  globe: { size: 0.85, alpha: 0.26, offsetX: 0, fit: 2.15 },
  network: { size: 0.85, alpha: 0.32, offsetX: 0, fit: 2.85 },
  crowd: { size: 0.55, alpha: 0.6, offsetX: 0, fit: 3.0 },
  constellation: { size: 0.85, alpha: 0.32, offsetX: 0, fit: 2.6 },
  crosshair: { size: 0.85, alpha: 0.3, offsetX: 0, fit: 1.8 },
  portrait: { size: 0.36, alpha: 0.85, offsetX: 0.55, fit: 1.5 },
  singularity: { size: 0.75, alpha: 0.08, offsetX: 0, fit: 1.1 },
};

export const OVERRIDE_LOOK = { size: 0.8, alpha: 0.3, brightness: 0.95, fit: 2.6 };
