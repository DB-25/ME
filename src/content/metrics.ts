import type { Metric } from "./types";
import { SRC } from "./sources";

// Strongest, deduplicated numbers. Conservative figure wherever sources disagree.
export const metrics: Metric[] = [
  {
    value: "26",
    numeric: 26,
    label: "AI tools shipped",
    context: "The AI for Impact program has built 26 tools for government and civic partners. I help lead its technical side.",
    source: SRC.aiForImpact,
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
    value: "20+",
    numeric: 20,
    suffix: "+",
    label: "Government and civic partners",
    context: "Agencies and organizations served by the AI for Impact portfolio.",
    source: SRC.aiForImpact,
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
    value: "2nd",
    numeric: 2,
    suffix: "nd",
    label: "Place, AWS x Riot Games hackathon",
    context: "VCT Scout placed second among more than 3,200 participants and won Best Cross-Regional Team Submission.",
    source: SRC.amazonVct,
    projectSlug: "vct-scout",
  },
  {
    value: "40%",
    numeric: 40,
    suffix: "%",
    label: "Lower model spend",
    context: "Smart Model picks a model per request by task, cost and token size. Self-reported in my resume.",
    source: SRC.resume,
    projectSlug: "genie",
  },
  {
    value: "4",
    numeric: 4,
    label: "Languages in production",
    context: "A-IEP serves English, Spanish, Vietnamese and Chinese. Arabic is built and enabled outside production.",
    source: SRC.aiepClaude,
    projectSlug: "a-iep",
  },
  {
    value: "15,000+",
    numeric: 15000,
    suffix: "+",
    label: "Users on my first big app",
    context: "Acharya ERP in Flutter. Store rating rose from 1.2 to 4.5 (rating self-reported). Total users, not daily.",
    source: SRC.acharyaUsers,
    projectSlug: "acharya-erp",
  },
];
