/** Set on <html> while a view transition between routes is in flight: "shared" (a project title and picture travel from the Work list into the case hero), "next" (the same move from the bottom of a case, slower and in-out), "plain" (dissolve only). */
export const PAGE_VT_ATTR = "data-page-vt";
/** The view-transition-name shared by the project title in the list and the case heading. */
export const SHARED_TITLE = "case-title";
/** The picture: the Work stage frame (or the "Up next" still) and the case hero media. */
export const SHARED_MEDIA = "case-media";
/** The row's subtitle: named only on the old page so it can leave on its own instead of ghosting under the title. */
export const OLD_TAG = "case-tag-out";

export type TransitionKind = "shared" | "next" | "plain";
