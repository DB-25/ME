const BASE = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

/**
 * Prefix a public/ path with the optional basePath. External URLs, mailto and
 * in-page anchors pass through untouched. Use it for every raw <a>/<img>/<video>
 * that points at a file in public/ (next/link adds basePath on its own).
 */
export function assetUrl(path: string): string {
  if (/^([a-z]+:|\/\/|#)/i.test(path)) return path;
  return `${BASE}${path.startsWith("/") ? path : `/${path}`}`;
}
