import type { Project } from "./types";
import { flagshipProjects } from "./project-data/flagship";
import { featuredMoreProjects } from "./project-data/featured-more";
import { moreProjects } from "./project-data/more";

// Ordered by impact: featured first, then platform, tools and lab work.
export const projects: Project[] = [...flagshipProjects, ...featuredMoreProjects, ...moreProjects];
