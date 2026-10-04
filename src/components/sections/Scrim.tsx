/**
 * A soft void halo that sits behind dense text so particles never sit under it.
 * No hard edges: the gradient reaches zero before the box ends. The parent must be `relative`.
 * - "radial": a feathered ellipse over the whole box (blocks in the middle of a section).
 * - "left" / "right": a horizontal falloff, solid on that side (blocks next to a formation).
 * - "hold": solid from the left edge to ~70% of the box, then a long fade (text on the left half beside a formation).
 * - "band": solid across the whole box, feathered on all four sides (full-width rows and strips).
 */
type Props = {
  shape?: "radial" | "left" | "right" | "band" | "hold";
  strength?: number;
  /** CSS inset, e.g. "-10% -6%". */
  inset?: string;
  /** Top and bottom feather in px for the non-radial shapes (default 56). Use a small value on short boxes, or the scrim never reaches full strength. */
  feather?: number;
  className?: string;
};

const GRADIENT = (shape: NonNullable<Props["shape"]>, a: number) => {
  const core = `rgb(6 5 9 / ${a})`;
  const mid = `rgb(6 5 9 / ${(a * 0.72).toFixed(2)})`;
  if (shape === "band") return core;
  if (shape === "hold") return `linear-gradient(90deg, ${core} 0%, ${core} 68%, transparent 100%)`;
  if (shape === "left") return `linear-gradient(90deg, ${core} 0%, ${mid} 55%, transparent 100%)`;
  if (shape === "right") return `linear-gradient(270deg, ${core} 0%, ${mid} 55%, transparent 100%)`;
  return `radial-gradient(ellipse closest-side at 50% 50%, ${core} 0%, ${core} 42%, ${mid} 70%, transparent 100%)`;
};

/** Horizontal falloffs also feather their top and bottom, so no edge of the box is ever visible. */
const feathered = (px: number) => `linear-gradient(to bottom, transparent 0, #000 ${px}px, #000 calc(100% - ${px}px), transparent 100%)`;
const bandStyle = (px: number) => {
  const mask = `${feathered(px)}, linear-gradient(to right, transparent 0, #000 8%, #000 92%, transparent 100%)`;
  return { maskImage: mask, WebkitMaskImage: mask, maskComposite: "intersect", WebkitMaskComposite: "source-in" } as const;
};

export function Scrim({ shape = "radial", strength = 0.8, inset, feather = 56, className = "" }: Props) {
  const fade = feathered(feather);
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute -z-10 ${className}`}
      style={{ inset: inset ?? (shape === "radial" ? "-14% -8%" : "-10% -6%"), background: GRADIENT(shape, strength), ...(shape === "radial" ? {} : shape === "band" ? bandStyle(feather) : { maskImage: fade, WebkitMaskImage: fade }) }}
    />
  );
}
