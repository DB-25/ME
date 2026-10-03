/**
 * Whether the current route has [data-chapter] sections. Written by useChapterScroll whenever it
 * rescans the DOM, read by the field every frame, so no per-frame querySelector.
 */
export const chapterPresence = { present: true };
