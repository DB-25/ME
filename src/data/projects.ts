export interface Project {
  id: string;
  name: string;
  subtitle: string;
  description: string;
  metrics: { label: string; value: string }[];
  techStack: string[];
  links?: { label: string; url: string }[];
  sceneId: string;
  flagship: boolean;
  accentColor?: string;
  award?: string;
}

export const projects: Project[] = [
  // === FLAGSHIPS ===
  {
    id: "knowledge-agent",
    name: "knowledge-agent-for-impact",
    subtitle: "Reusable RAG Platform for Government",
    description:
      "Architected a reusable RAG platform using AWS CDK, Python, and OpenSearch Serverless — adopted across 10+ production deployments for state and municipal agencies, establishing shared LLM infrastructure for the entire AI for Impact program.",
    metrics: [
      { label: "Deployments", value: "10+" },
      { label: "Agencies", value: "20+" },
      { label: "Users Served", value: "500K+" },
    ],
    techStack: [
      "AWS CDK",
      "Python",
      "OpenSearch Serverless",
      "Lambda",
      "DynamoDB",
      "S3",
      "KMS",
    ],
    sceneId: "knowledge-agent",
    flagship: true,
  },
  {
    id: "genie",
    name: "GENIE",
    subtitle: "AI Sandbox for 44K+ State Employees",
    description:
      "Launched a secure multi-model AI sandbox (Claude, Titan, Mistral) with side-by-side comparison and smart model routing across 14 models — adopted by 44K+ state employees across 8+ Massachusetts departments. Presented to Governor Maura Healey.",
    metrics: [
      { label: "State Employees", value: "44K+" },
      { label: "Cost Reduction", value: "40%" },
      { label: "Departments", value: "8+" },
    ],
    techStack: [
      "AWS Bedrock",
      "Claude",
      "Titan",
      "Mistral",
      "LangChain",
      "Python",
      "React",
    ],
    links: [
      {
        label: "Open Source",
        url: "https://github.com/The-Burnes-Center/gen-ai-sandbox-for-impact",
      },
    ],
    sceneId: "genie",
    flagship: true,
  },
  {
    id: "vct-scout",
    name: "VCT Scout",
    subtitle: "2nd / 3,300+ Teams — AWS re:Invent 2024",
    description:
      "GenAI assistant built with AWS Bedrock Agents analyzing 1TB+ of Valorant Champions Tour game logs. Helps team managers build competitive rosters based on player rankings and match criteria.",
    metrics: [
      { label: "Placement", value: "2nd / 3,300+" },
      { label: "Prize", value: "$8K + $8K AWS" },
      { label: "Game Logs", value: "1TB+" },
    ],
    techStack: ["AWS Bedrock Agents", "Claude API", "Python", "S3"],
    sceneId: "vct",
    flagship: true,
    accentColor: "#EF4444",
  },
  {
    id: "one-l-abe",
    name: "One-L + ABE",
    subtitle: "AI-Powered Procurement Modernization",
    description:
      "One-L: Contract analysis tool using Claude via Bedrock with 11-stage Step Functions orchestration for conflict detection and redlining — 83% reduction in legal review time. ABE: Assistive Buyer Engine with RAGAS evaluation pipeline and CloudWatch observability.",
    metrics: [
      { label: "Legal Review Cut", value: "83%" },
      { label: "Pipeline Stages", value: "11" },
      { label: "CloudWatch Alarms", value: "8" },
    ],
    techStack: [
      "Claude via Bedrock",
      "AWS Step Functions",
      "RAGAS",
      "CloudWatch",
      "DynamoDB",
      "Lambda",
    ],
    sceneId: "one-l",
    flagship: true,
    award: "2025 NASPO Cronin Gold Award + Academic Collaboration Award",
  },

  // === SECONDARY ===
  {
    id: "a-iep",
    name: "A-IEP",
    subtitle: "AI for Individualized Education Programs",
    description:
      "Multi-agent document system with 7-stage AWS Step Functions pipeline (OCR, PII redaction via Comprehend, parallel AI analysis, 4-language translation) serving 1,000+ families.",
    metrics: [
      { label: "Families Served", value: "1,000+" },
      { label: "Languages", value: "4" },
      { label: "Pipeline Stages", value: "7" },
    ],
    techStack: [
      "AWS Step Functions",
      "Comprehend",
      "Bedrock",
      "Lambda",
      "S3",
    ],
    links: [{ label: "Website", url: "https://a-iep.org" }],
    sceneId: "aiep",
    flagship: false,
  },
  {
    id: "smart-model",
    name: "Smart Model Selector",
    subtitle: "Intelligent Multi-Model Routing",
    description:
      "Lambda + API Gateway system routing queries across 14 AI models by task, cost, and token requirements — cutting costs by 40%. Benchmarked latency, cost, and instruction-following with in-house evaluation frameworks.",
    metrics: [
      { label: "Models", value: "14" },
      { label: "Cost Cut", value: "40%" },
    ],
    techStack: ["Lambda", "API Gateway", "Bedrock", "Python"],
    sceneId: "smart-model",
    flagship: false,
  },
  {
    id: "rag-pipeline",
    name: "Reusable CI/CD RAG Pipeline",
    subtitle: "Production RAG Infrastructure",
    description:
      "Built reusable CI/CD RAG pipeline with LangChain, improving retrieval accuracy by 20% and reducing hallucinations by 40%.",
    metrics: [
      { label: "Retrieval Accuracy", value: "+20%" },
      { label: "Hallucination Cut", value: "40%" },
    ],
    techStack: ["LangChain", "FAISS", "Python", "GitHub Actions"],
    sceneId: "rag",
    flagship: false,
  },
];

export const aiForImpact = {
  title: "AI for Impact Program",
  role: "Technical Lead",
  description:
    "The Burnes Center's AI for Impact program builds AI tools that solve real problems in government. As Technical Lead, Dhruv oversees architecture, mentors 50+ engineers, and bridges research to production across 26 AI tools for 20+ state and municipal agencies.",
  totalTools: 26,
  totalAgencies: "20+",
  totalUsers: "500K+",
  url: "https://burnes.northeastern.edu/ai-for-impact-coop/",
};
