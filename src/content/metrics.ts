import type { Metric } from "./types";
import { REPO, SRC } from "./sources";

// Strongest, deduplicated numbers. Conservative figure wherever sources disagree.
export const metrics: Metric[] = [
  {
    value: "375+",
    numeric: 375,
    suffix: "+",
    label: "IEPs read by A-IEP",
    context: "Plans processed in production since launch, from about 260 family accounts (July 2026). A parent who can read the plan can speak up in the meeting. I lead A‑IEP’s engineering.",
    source: REPO.aiepResearchLog,
    projectSlug: "a-iep",
  },
  {
    value: "16,148",
    numeric: 16148,
    label: "Monthly active users on Acharya ERP",
    context: "Android, from the Play Console: 2,972 when I took it over on 1 Sep 2021, 16,148 when I handed it over on 31 Aug 2023. Every student and staff member used it. Where I learned that when an app breaks, a real person has a bad day.",
    source: SRC.acharyaPlay,
    asOf: "Aug 2023",
    projectSlug: "acharya-erp",
  },
  {
    value: "44,000+",
    numeric: 44000,
    suffix: "+",
    label: "State employees with access",
    context: "A sanctioned place to try AI is where a government starts using it. This counts access, not daily use. I co-built the sandbox behind the number.",
    source: SRC.burnesBio,
    asOf: "5 Oct 2026",
    projectSlug: "genie",
  },
  {
    value: "26",
    numeric: 26,
    label: "AI tools shipped",
    context: "A program total, not mine alone: the AI for Impact program has built 26 tools for government and civic partners. I help lead its technical side.",
    source: SRC.aiForImpact,
    asOf: "5 Oct 2026",
  },
  {
    value: "50+",
    numeric: 50,
    suffix: "+",
    label: "Engineers mentored",
    context: "Student engineers taken from prototype to production deployments across the program. A headcount across the program, not a measured outcome.",
    source: SRC.resume,
  },
  {
    value: "2nd",
    numeric: 2,
    suffix: "nd",
    label: "Place, AWS x Riot Games hackathon",
    context: "VCT Scout also won Best Cross-Regional Team Submission, built in a hackathon sprint with three teammates.",
    source: SRC.amazonVct,
    asOf: "Dec 2024",
    projectSlug: "vct-scout",
  },
  {
    value: "2",
    numeric: 2,
    label: "NASPO awards for ABE and One-L",
    context: "The Cronin Gold Award and the Academic Collaboration Award, won in 2025 by Massachusetts OSD with the Burnes Center, before I joined either project. I now lead ABE's quality monitoring and One-L's direction.",
    source: SRC.naspo,
    projectSlug: "abe-one-l",
  },
];
