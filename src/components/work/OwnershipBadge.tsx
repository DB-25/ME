import type { Project } from "@/content";

export type Ownership = NonNullable<Project["ownership"]>;

/** The mono word shown on the badge. */
export const OWNERSHIP_LABEL: Record<Ownership, string> = {
  sole: "SOLE",
  lead: "LEAD",
  core: "CORE",
  advisor: "ADVISOR",
};

/** What each word means, for the hover title and for screen readers. */
export const OWNERSHIP_TITLE: Record<Ownership, string> = {
  sole: "Sole author",
  lead: "Led the engineering",
  core: "Core contributor on a team build",
  advisor: "Technical direction",
};

/** Sole and lead read in the accent; core and advisor stay muted. Same hairline chip everywhere. */
const TONE: Record<Ownership, string> = {
  sole: "border-accent/50 text-accent-hot",
  lead: "border-accent/50 text-accent-hot",
  core: "border-hairline-strong text-muted",
  advisor: "border-hairline-strong text-muted",
};

/**
 * My share of a build as a quiet mono chip: SOLE, LEAD, CORE or ADVISOR. Self-contained (Tailwind only, no
 * stylesheet needed), so it renders the same on the home page and on case studies. Renders nothing when the
 * project has no `ownership`. `className` is for placement only (margins, absolute position).
 *
 *   <OwnershipBadge ownership={project.ownership} className="mt-2" />
 */
export function OwnershipBadge({ ownership, className = "" }: { ownership?: Ownership; className?: string }) {
  if (!ownership) return null;
  return (
    <span
      data-ownership={ownership}
      title={OWNERSHIP_TITLE[ownership]}
      className={`ob inline-flex w-fit flex-none select-none items-center whitespace-nowrap border bg-void/60 px-1.5 py-[3px] font-mono text-[11px] font-normal not-italic leading-none tracking-[0.08em] [text-shadow:none] ${TONE[ownership]} ${className}`}
    >
      <span aria-hidden>{OWNERSHIP_LABEL[ownership]}</span>
      <span className="sr-only">Ownership: {OWNERSHIP_TITLE[ownership]}</span>
    </span>
  );
}
