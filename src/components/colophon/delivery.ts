/** JavaScript fetched for this page load, summed from the Resource Timing buffer. */

export type ScriptDelivery = {
  /** Compressed bytes that crossed the network. */
  transferred: number;
  files: number;
  /** Files served from the browser cache: they count as files but add no network bytes. */
  cached: number;
  /** The browser's resource buffer filled up, so the true total may be higher. */
  partial: boolean;
};

/** Chrome's default resource timing buffer holds 250 entries. */
const BUFFER_LIMIT = 250;
const SCRIPT_URL = /\.js$/;

export function measureScripts(): ScriptDelivery {
  const entries = performance.getEntriesByType("resource") as PerformanceResourceTiming[];
  let transferred = 0;
  let files = 0;
  let cached = 0;
  for (const entry of entries) {
    if (!SCRIPT_URL.test(new URL(entry.name, location.href).pathname)) continue;
    files += 1;
    if (entry.transferSize > 0) transferred += entry.transferSize;
    else if (entry.encodedBodySize > 0) cached += 1;
  }
  return { transferred, files, cached, partial: entries.length >= BUFFER_LIMIT };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
