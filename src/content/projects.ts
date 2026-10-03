import type { Project } from "./types";
import { flagshipProjects } from "./project-data/flagship";
import { featuredMoreProjects } from "./project-data/featured-more";
import { moreProjects } from "./project-data/more";

// Ordered by impact: featured first, then platform, tools and lab work.
const ordered: Project[] = [...flagshipProjects, ...featuredMoreProjects, ...moreProjects];

/** arc-control-mcp is the best solo, founder-relevant tool: it sits third in the featured list, after A-IEP and GENIE. */
const ARC_SLUG = "arc-control-mcp";
const ARC_POSITION = 2;

const arc = ordered.find((p) => p.slug === ARC_SLUG);
const rest = ordered.filter((p) => p.slug !== ARC_SLUG);

export const projects: Project[] = arc ? [...rest.slice(0, ARC_POSITION), arc, ...rest.slice(ARC_POSITION)] : ordered;
