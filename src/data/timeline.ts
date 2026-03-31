export interface Milestone {
  id: string;
  year: string;
  title: string;
  subtitle: string;
  description: string;
  metrics?: { label: string; value: string }[];
  accentColor?: string;
}

export const timeline: Milestone[] = [
  {
    id: "bangalore",
    year: "2018–2022",
    title: "Bangalore, India",
    subtitle: "B.E. in Computer Science + First Engineering Roles",
    description:
      "Built cross-platform ERP app in Flutter for 20K+ daily users at Acharya Institutes, elevating app store ratings from 1.2 to 4.5. Engineered CNN-based fraud detection model at WeSource Company with 87.34% accuracy.",
    metrics: [
      { label: "Daily Users", value: "20K+" },
      { label: "App Rating", value: "1.2 → 4.5" },
      { label: "Fraud Detection", value: "87.34%" },
    ],
  },
  {
    id: "northeastern",
    year: "2022–2024",
    title: "Crossing Oceans",
    subtitle: "M.S. in AI — Northeastern University",
    description:
      "Moved from Bangalore to Boston to pursue a Master's in Artificial Intelligence at Khoury College of Computer Sciences. Focused on computer vision, NLP, and deep learning. GPA: 3.83.",
    metrics: [{ label: "GPA", value: "3.83" }],
  },
  {
    id: "coop",
    year: "Jan–Jun 2024",
    title: "Burnes Center Co-op",
    subtitle: "GenAI Product Development Co-op",
    description:
      "Launched GENIE, a secure multi-model AI sandbox adopted by 44K+ state employees across 8+ Massachusetts departments. Designed Smart Model Selector routing queries across 14 models, cutting costs by 40%. Presented to the Governor.",
    metrics: [
      { label: "State Employees", value: "44K+" },
      { label: "Cost Reduction", value: "40%" },
      { label: "Models Routed", value: "14" },
    ],
  },
  {
    id: "vct",
    year: "Dec 2024",
    title: "VCT Scout Hackathon",
    subtitle: "AWS × Riot Games — re:Invent 2024",
    description:
      "Built a GenAI assistant using AWS Bedrock Agents to analyze 1TB+ of Valorant game logs. Placed 2nd out of 3,300+ teams worldwide. Won Best Cross-Regional Team, $8K prize + $8K AWS credits.",
    metrics: [
      { label: "Placement", value: "2nd / 3,300+" },
      { label: "Prize", value: "$16K total" },
      { label: "Game Logs", value: "1TB+" },
    ],
    accentColor: "#EF4444",
  },
  {
    id: "fulltime",
    year: "Jul 2024–Present",
    title: "Technical Lead",
    subtitle: "Burnes Center for Social Change",
    description:
      "Led A-IEP (1,000+ families served), built Voice Survey Agent, mentored 50+ engineers in GenAI architecture. Developed One-L (83% legal review reduction, NASPO Gold Award) and ABE (RAGAS evaluation pipeline with CloudWatch observability).",
    metrics: [
      { label: "Engineers Mentored", value: "50+" },
      { label: "Legal Review Cut", value: "83%" },
      { label: "Families Helped", value: "1,000+" },
    ],
  },
  {
    id: "scale",
    year: "2024–2025",
    title: "The Scale",
    subtitle: "AI for Impact Program",
    description:
      "Architected knowledge-agent-for-impact, a reusable RAG platform adopted across 10+ production deployments. Technical lead across 26 AI tools for 20+ government agencies serving 500K+ users.",
    metrics: [
      { label: "AI Tools", value: "26" },
      { label: "Agencies", value: "20+" },
      { label: "Users Served", value: "500K+" },
    ],
  },
];
