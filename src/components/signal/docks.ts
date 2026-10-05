import type { ChapterId } from "@/lib/director/protocol";

/**
 * Docks: a chapter's formation can be pinned to a place in the page instead of the viewport. A section marks an
 * empty box with `data-field-dock="<chapter id>"`; the field fits the formation into it and carries it along with
 * the document as it scrolls, so it frames the header it belongs to and leaves with it, rather than sitting
 * behind the rows that scroll past. Geometry is cached in document pixels and re-measured on layout changes only,
 * so a frame reads no layout.
 */
export type Dock = {
  /** Centre of the box, in document pixels. */
  cx: number;
  cy: number;
  /** Half extents of the box, in px. */
  rx: number;
  ry: number;
};

const docks = new Map<ChapterId, Dock>();

export const getDock = (id: ChapterId): Dock | undefined => docks.get(id);

/** Chapters that dock to a box carry it with the page; the email is a dock of its own kind (see emailFormation). */
export function setDock(id: ChapterId, dock: Dock | null) {
  if (dock) docks.set(id, dock);
  else docks.delete(id);
}

/** Re-reads every `[data-field-dock]` box. Hidden boxes (display: none at this breakpoint) count as absent. */
export function measureDocks() {
  const x = window.scrollX;
  const y = window.scrollY;
  const seen = new Set<ChapterId>();
  document.querySelectorAll<HTMLElement>("[data-field-dock]").forEach((el) => {
    const id = el.dataset.fieldDock as ChapterId;
    const r = el.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return;
    seen.add(id);
    docks.set(id, { cx: r.left + x + r.width / 2, cy: r.top + y + r.height / 2, rx: r.width / 2, ry: r.height / 2 });
  });
  // The email dock is owned by emailFormation, everything else follows the DOM.
  for (const id of [...docks.keys()]) if (id !== "contact" && !seen.has(id)) docks.delete(id);
}

/**
 * Half extents, in world units at scale 1, of the formations that dock to a box. The field scales the formation
 * so these fit the box. A chapter with a dock but no entry here is "fixed": authored in screen px already.
 */
export const DOCK_EXTENT: Partial<Record<ChapterId, { rx: number; ry: number }>> = {
  /** Five orbit rings out to radius 2.4, tilted so the vertical reach is about 0.6 of it. */
  proof: { rx: 2.45, ry: 1.5 },
};
