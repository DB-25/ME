const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/** Prefix a public/ path with the optional basePath. External URLs pass through untouched. */
export function assetUrl(path: string): string {
  if (/^(https?:)?\/\//.test(path) || path.startsWith("data:")) return path;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Internal route for a case study, as a next/link href (basePath is added by next/link). */
export const caseHref = (slug: string) => `/work/${slug}/`;
