import type { Project } from "./types";
import { flagshipProjects } from "./project-data/flagship";
import { featuredMoreProjects } from "./project-data/featured-more";
import { moreProjects } from "./project-data/more";
import { PRODUCTION_NOTES } from "./project-data/notes";

// Ordered by impact: featured first, then platform, tools and lab work.
const ordered: Project[] = [...flagshipProjects, ...featuredMoreProjects, ...moreProjects].map((p) =>
  PRODUCTION_NOTES[p.slug] ? { ...p, notes: PRODUCTION_NOTES[p.slug] } : p,
);

/**
 * The top of the featured list is pinned: A-IEP, GENIE, then arc-control-mcp (the best solo, founder-relevant
 * tool) and Civic AI Course Delivery (DB's current primary focus at work). The rest keep their data-file order.
 */
const PINNED_SLUGS = ["a-iep", "genie", "arc-control-mcp", "course-delivery"];

const pinned = PINNED_SLUGS.flatMap((slug) => ordered.filter((p) => p.slug === slug));
const rest = ordered.filter((p) => !PINNED_SLUGS.includes(p.slug));

export const projects: Project[] = [...pinned, ...rest];
