import { profile } from "@/content";

export type SourceRef = { label: string; href?: string; external: boolean };

const PUBLIC_MARK = "/ME/public/";

/**
 * Turns a metric's raw `source` into something a visitor can read. URLs link out.
 * Local paths never leak: they become a humane label, and a link only when the
 * file is served from /public.
 */
export function sourceRef(source: string): SourceRef {
  if (/^https?:\/\//.test(source)) {
    const host = new URL(source).hostname.replace(/^www\./, "");
    return { label: `source: ${host}`, href: source, external: true };
  }
  if (source.endsWith(".tex")) return { label: "source: resume", href: profile.resumeHref, external: true };
  const i = source.indexOf(PUBLIC_MARK);
  if (i >= 0) {
    const label = source.includes("acharya-users") ? "source: store analytics" : "source: document scan";
    return { label, href: `/${source.slice(i + PUBLIC_MARK.length)}`, external: true };
  }
  if (source.endsWith(".csv")) return { label: "source: my notes", external: false };
  if (source.startsWith("git log")) return { label: "source: git history", external: false };
  return { label: "source: private repo", external: false };
}
