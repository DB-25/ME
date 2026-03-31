export interface ImpactMetric {
  id: string;
  value: string;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  label: string;
  description: string;
}

export interface Award {
  id: string;
  title: string;
  year: string;
  issuer: string;
}

export const impactMetrics: ImpactMetric[] = [
  {
    id: "users",
    value: "500K+",
    numericValue: 500000,
    suffix: "+",
    label: "Users Served",
    description: "Across 20+ government agencies",
  },
  {
    id: "tools",
    value: "26",
    numericValue: 26,
    label: "AI Tools Built",
    description: "For state and municipal agencies",
  },
  {
    id: "agencies",
    value: "20+",
    numericValue: 20,
    suffix: "+",
    label: "Government Agencies",
    description: "Massachusetts, New Jersey, Boston & more",
  },
  {
    id: "benefits",
    value: "$5.4M+",
    numericValue: 5.4,
    prefix: "$",
    suffix: "M+",
    label: "Federal Benefits Unlocked",
    description: "Through AI-powered eligibility tools",
  },
  {
    id: "legal",
    value: "83%",
    numericValue: 83,
    suffix: "%",
    label: "Legal Review Time Reduction",
    description: "One-L contract analysis tool",
  },
  {
    id: "mentored",
    value: "50+",
    numericValue: 50,
    suffix: "+",
    label: "Engineers Mentored",
    description: "In GenAI architecture & deployment",
  },
  {
    id: "hackathon",
    value: "3,300+",
    numericValue: 3300,
    suffix: "+",
    label: "Teams Beaten",
    description: "VCT Scout — AWS re:Invent 2024",
  },
];

export const awards: Award[] = [
  {
    id: "naspo-gold",
    title: "NASPO Cronin Gold Award",
    year: "2025",
    issuer: "National Association of State Procurement Officials",
  },
  {
    id: "naspo-academic",
    title: "NASPO Academic Collaboration Award",
    year: "2025",
    issuer: "National Association of State Procurement Officials",
  },
  {
    id: "governor",
    title: "Governor's Presentation",
    year: "2024",
    issuer: "Commonwealth of Massachusetts",
  },
];
