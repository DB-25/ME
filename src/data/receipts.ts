/**
 * Receipts — third-party, verifiable sources behind the claims.
 * These are the trust layer: every headline number should be able to point
 * at one of these. Rendered as source strips/chips, never as bare links.
 */

export interface Receipt {
  id: string;
  /** Short outlet name shown on the chip, e.g. "mass.gov" */
  outlet: string;
  /** What this source verifies, one line. */
  verifies: string;
  url: string;
  /** Related project ids (matches projects[].id), if any. */
  projects?: string[];
}

export const receipts: Receipt[] = [
  {
    id: "massgov",
    outlet: "mass.gov",
    verifies: "Governor Healey met the GENIE team — official Governor's Office announcement",
    url: "https://www.mass.gov/news/governor-healey-meets-with-northeastern-students-working-with-administration-on-ai-project-under-innovatema-partnership",
    projects: ["genie"],
  },
  {
    id: "govtech",
    outlet: "GovTech",
    verifies: "Coverage of the AI tools improving Massachusetts government",
    url: "https://www.govtech.com/education/higher-ed/northeastern-university-student-projects-improve-government-with-ai",
    projects: ["genie"],
  },
  {
    id: "amazon",
    outlet: "Amazon Press",
    verifies: "AWS × Riot Games hackathon result — 2nd of 3,300+ teams",
    url: "https://press.aboutamazon.com/2024/12/aws-and-riot-games-announce-the-winner-of-the-valorant-champions-tour-hackathon-esports-manager-challenge",
    projects: ["vct-scout"],
  },
  {
    id: "devpost",
    outlet: "Devpost",
    verifies: "VCT Scout — the actual hackathon submission",
    url: "https://devpost.com/software/vct-scout",
    projects: ["vct-scout"],
  },
  {
    id: "vct-demo",
    outlet: "Demo video",
    verifies: "Watch VCT Scout build a roster from 1TB+ of match data",
    url: "https://vimeo.com/1026644404/ba8c799d41",
    projects: ["vct-scout"],
  },
  {
    id: "nu-news",
    outlet: "Northeastern News",
    verifies: "Feature on the VCT Scout win",
    url: "https://news.northeastern.edu/2025/02/04/valorant-hackathon-challenge-ai/",
    projects: ["vct-scout"],
  },
  {
    id: "aiep-live",
    outlet: "a-iep.org",
    verifies: "A-IEP is live — use it yourself",
    url: "https://a-iep.org",
    projects: ["a-iep"],
  },
  {
    id: "aiep-blog",
    outlet: "Reboot Democracy",
    verifies: "How families co-designed A-IEP's prompts",
    url: "https://rebootdemocracy.ai/blog/unboxing-the-prompt-how-community-feedback-and-ai-helped-us-build-better-ai-together",
    projects: ["a-iep"],
  },
  {
    id: "abe-eval-demo",
    outlet: "Eval demo",
    verifies: "Watch ABE's RAGAS evaluation pipeline run — faithfulness, relevancy, precision, recall",
    url: "/videos/abe-eval.mp4",
    projects: ["one-l-abe"],
  },
  {
    id: "genie-oss",
    outlet: "GitHub",
    verifies: "GENIE is open source — read the code",
    url: "https://github.com/The-Burnes-Center/gen-ai-sandbox-for-impact",
    projects: ["genie"],
  },
];

export function receiptsForProject(projectId: string): Receipt[] {
  return receipts.filter((r) => r.projects?.includes(projectId));
}
