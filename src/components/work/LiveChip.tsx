import type { Project } from "@/content";
import { assetUrl } from "./asset";
import { liveLink } from "./meta";

/**
 * "Live": opens the running product in a new tab. Always a sibling of the case-study link (never inside it), so the
 * two targets stay separate for keyboard and screen readers. The visible word is the start of the accessible name.
 */
export function LiveChip({ project }: { project: Project }) {
  const live = liveLink(project);
  if (!live) return null;
  return (
    <a
      className="wk-live label"
      href={assetUrl(live.href)}
      target="_blank"
      rel="noopener noreferrer"
      data-cursor="live"
      aria-label={`Live: ${live.label} (${project.name}), opens in a new tab`}
    >
      <i aria-hidden />
      <span>Live</span>
      <span aria-hidden>&#8599;</span>
    </a>
  );
}
