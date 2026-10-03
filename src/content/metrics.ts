import type { Metric } from "./types";
import { SRC } from "./sources";

// Strongest, deduplicated numbers. Conservative figure wherever sources disagree.
export const metrics: Metric[] = [
  {
    value: "1,000+",
    numeric: 1000,
    suffix: "+",
    label: "Families using A-IEP",
    context: "A parent who can read the plan can speak up in the meeting. I lead A‑IEP’s engineering.",
    source: SRC.resume,
    projectSlug: "a-iep",
  },
  {
    value: "20,000+",
    numeric: 20000,
    suffix: "+",
    label: "Daily users on Acharya ERP",
    context: "Where I learned that when an app breaks, a real person has a bad day.",
    source: SRC.resume,
    projectSlug: "acharya-erp",
  },
  {
    value: "44,000+",
    numeric: 44000,
    suffix: "+",
    label: "State employees with access",
    context: "A sanctioned place to try AI is where a government starts using it. I co-built the sandbox behind the number.",
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
    context: "VCT Scout also won Best Cross-Regional Team Submission, built in a hackathon sprint with three teammates.",
    source: SRC.amazonVct,
    projectSlug: "vct-scout",
  },
  {
    value: "2",
    numeric: 2,
    label: "NASPO awards in 2025",
    context: "Recognition for state procurement AI: the Cronin Gold Award and the Academic Collaboration Award.",
    source: SRC.naspo,
    projectSlug: "abe-one-l",
  },
  {
    value: "40%",
    numeric: 40,
    suffix: "%",
    label: "Lower model spend",
    context: "Smart Model matches each request to a fitting model by task, cost and token size.",
    source: SRC.resume,
    projectSlug: "genie",
  },
];
