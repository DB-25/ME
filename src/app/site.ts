/**
 * Public URL building. NEXT_PUBLIC_SITE_URL may be a bare origin (https://db25.dev) or already carry the base
 * path (https://db-25.github.io/ME); both end up as the same origin plus the base path, never doubled.
 */
const RAW_SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://db25.dev").replace(/\/+$/, "");

export const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

export const SITE_ORIGIN = BASE_PATH && RAW_SITE_URL.endsWith(BASE_PATH) ? RAW_SITE_URL.slice(0, -BASE_PATH.length) : RAW_SITE_URL;

/** Origin plus base path, no trailing slash. */
export const SITE_ROOT = `${SITE_ORIGIN}${BASE_PATH}`;

/** Absolute URL for a site path such as "/work/genie/". */
export function siteUrl(path = "/"): string {
  return `${SITE_ROOT}${path.startsWith("/") ? path : `/${path}`}`;
}
