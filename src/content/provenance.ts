import type { Basis, Metric } from "./types";

/** Short label and one-line meaning for each basis. The label is what a visitor sees next to a figure. */
export const BASIS: Record<Basis, { label: string; meaning: string }> = {
  "third-party": { label: "Third party", meaning: "Published by someone who is not me or my employer." },
  employer: { label: "Employer-reported", meaning: "Published by the Burnes Center, my employer." },
  self: { label: "Self-reported", meaning: "Comes from my résumé or my own notes." },
  repo: { label: "From the repo", meaning: "Read from a repository or its docs. A public repo links out; a private one is labelled and cannot be opened." },
};

const THIRD_PARTY_HOSTS = [
  "naspo.org",
  "press.aboutamazon.com",
  "api.npmjs.org",
  "news.northeastern.edu",
  "govtech.com",
  "mass.gov",
  "bizjournals.com",
];
const EMPLOYER_HOSTS = ["burnes.northeastern.edu", "rebootdemocracy.ai"];
const SELF_HOSTS = ["devpost.com"];

/**
 * Who stands behind a figure. An explicit `basis` wins. Otherwise it is read from the source: a public page by
 * its host, a résumé or a notes file as self-reported, a Governor's citation scan as third party, anything else
 * local as the repo. A Devpost page is the team's own submission, so it counts as self-reported; GitHub pages count as the repo.
 */
export function basisOf(metric: Pick<Metric, "source" | "basis">): Basis {
  if (metric.basis) return metric.basis;
  const src = metric.source;
  if (/^https?:\/\//.test(src)) {
    const host = new URL(src).hostname.replace(/^www\./, "");
    if (THIRD_PARTY_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "third-party";
    if (EMPLOYER_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "employer";
    if (SELF_HOSTS.some((h) => host === h || host.endsWith(`.${h}`))) return "self";
    return "repo";
  }
  if (src.endsWith(".tex") || src.endsWith(".csv")) return "self";
  if (src.includes("governors-citation")) return "third-party";
  if (src.includes("acharya-users") || src.includes("play-console")) return "self";
  return "repo";
}
