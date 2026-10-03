import type { Metric } from "./types";
import { SRC } from "./sources";

// Strongest, deduplicated numbers. Conservative figure wherever sources disagree.
export const metrics: Metric[] = [
  {
    value: "1,000+",
    numeric: 1000,
    suffix: "+",
    label: "Families using A-IEP",
    context: "Parents reading their child's special-education plan in plain language, in four languages. I lead its engineering.",
    source: SRC.resume,
    projectSlug: "a-iep",
  },
  {
    value: "20,000+",
    numeric: 20000,
    suffix: "+",
    label: "Daily users on my first app",
    context: "Acharya ERP, a Flutter app I owned from design to deployment. Store rating went from 1.2 to 4.5.",
    source: SRC.resume,
    projectSlug: "acharya-erp",
  },
  {
    value: "44,000+",
    numeric: 44000,
    suffix: "+",
    label: "State employees with access",
    context: "The Generative AI Sandbox I co-built let Massachusetts state employees explore AI safely. This counts access, not daily use.",
    source: SRC.burnesBio,
    projectSlug: "genie",
  },
  {
    value: "26",
    numeric: 26,
    label: "AI tools shipped",
    context: "The AI for Impact program has built 26 tools for government and civic partners. I help lead its technical side.",
    source: SRC.aiForImpact,
  },
  {
    value: "50+",
    numeric: 50,
    suffix: "+",
    label: "Engineers mentored",
    context: "Student engineers taken from prototype to production deployments across the program.",
    source: SRC.resume,
  },
  {
    value: "2nd",
    numeric: 2,
    suffix: "nd",
    label: "Place, AWS x Riot Games hackathon",
    context: "VCT Scout placed second among more than 3,200 participants and won Best Cross-Regional Team Submission.",
    source: SRC.amazonVct,
    projectSlug: "vct-scout",
  },
  {
    value: "2",
    numeric: 2,
    label: "NASPO awards in 2025",
    context: "Cronin Gold and Academic Collaboration, for the ABE and One-L procurement AI. Won by Massachusetts OSD with the Burnes Center.",
    source: SRC.naspo,
    projectSlug: "abe-one-l",
  },
  {
    value: "40%",
    numeric: 40,
    suffix: "%",
    label: "Lower model spend",
    context: "Smart Model picks a model per request by task, cost and token size.",
    source: SRC.resume,
    projectSlug: "genie",
  },
];
