export type ArchNodeType =
  | "client"
  | "security"
  | "edge"
  | "compute"
  | "ai"
  | "data"
  | "storage";

export interface ArchNode {
  id: string;
  label: string;
  type: ArchNodeType;
}

export interface Architecture {
  nodes: ArchNode[];
  edges: [string, string][];
}

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
  year?: string;
  kind?: "ai" | "swe" | "ml";
  // Case-study fields (used by the scroll-pinned story)
  problem?: string;
  approach?: string;
  tradeoff?: string;
  architecture?: Architecture;
  /** Path under /public to a product screenshot (16:10-ish). Components render
   *  a graceful placeholder frame until the file exists. */
  screenshot?: string;
  /** Demo video — a local path under /public ("/videos/x.mp4", rendered as a
   *  native <video>) or an embeddable player URL (rendered as an iframe).
   *  Takes precedence over the screenshot in the case-study evidence frame. */
  video?: string;
  /** Native videos only: silent screen-recordings can autoplay muted in a
   *  loop (living screenshot). Narrated videos should leave this false. */
  videoAutoplay?: boolean;
}

export const projects: Project[] = [
  // === FLAGSHIPS ===
  {
    id: "genie",
    name: "GENIE",
    subtitle: "AI Sandbox for 44K+ State Employees",
    description:
      "Secure multi-model AI sandbox (Claude, Titan, Mistral) with side-by-side comparison and smart model routing across 14 models. Adopted by 44K+ state employees across 8+ Massachusetts departments. Presented to Governor Maura Healey.",
    metrics: [
      { label: "State Employees", value: "44K+" },
      { label: "Cost Reduction", value: "40%" },
      { label: "Models Routed", value: "14" },
    ],
    techStack: ["AWS Bedrock", "Claude", "Cognito", "Lambda", "API Gateway", "React", "Python"],
    links: [
      { label: "Open Source", url: "https://github.com/The-Burnes-Center/gen-ai-sandbox-for-impact" },
      { label: "Governor's Office", url: "https://www.mass.gov/news/governor-healey-meets-with-northeastern-students-working-with-administration-on-ai-project-under-innovatema-partnership" },
      { label: "GovTech", url: "https://www.govtech.com/education/higher-ed/northeastern-university-student-projects-improve-government-with-ai" },
    ],
    sceneId: "genie",
    flagship: true,
    screenshot: "/screenshots/genie.png",
    year: "2024",
    kind: "ai",
    accentColor: "#5DCAA5",
    problem:
      "44K state employees wanted to use generative AI, but plugging public chatbots into government work is a security and cost nightmare.",
    approach:
      "A secure, multi-tenant sandbox behind Cognito + API Gateway that routes each query to the best of 14 models, with side-by-side comparison so teams could see tradeoffs themselves.",
    tradeoff:
      "Routing adds a hop and complexity — but the Smart Model Selector cut model spend 40% and let us swap models without touching product code.",
    architecture: {
      nodes: [
        { id: "user", label: "State employee", type: "client" },
        { id: "cognito", label: "Cognito", type: "security" },
        { id: "apigw", label: "API Gateway", type: "edge" },
        { id: "router", label: "Smart Model Selector", type: "compute" },
        { id: "bedrock", label: "Bedrock · 14 models", type: "ai" },
        { id: "dynamo", label: "DynamoDB", type: "data" },
      ],
      edges: [
        ["user", "cognito"],
        ["cognito", "apigw"],
        ["apigw", "router"],
        ["router", "bedrock"],
        ["router", "dynamo"],
      ],
    },
  },
  {
    id: "a-iep",
    name: "A-IEP",
    subtitle: "AI for Individualized Education Programs",
    description:
      "Multi-agent document system that makes 50-100 page IEP documents accessible to families. 7-stage AWS Step Functions pipeline handles OCR, PII redaction via Comprehend, parallel AI analysis, and 4-language translation. Built with community feedback — we showed parents the AI prompts and let them reshape the system.",
    metrics: [
      { label: "Families Served", value: "1,000+" },
      { label: "Languages", value: "4" },
      { label: "Pipeline Stages", value: "7" },
    ],
    techStack: ["AWS Step Functions", "Comprehend", "Bedrock", "Lambda", "S3"],
    links: [
      { label: "Website", url: "https://a-iep.org" },
      { label: "Blog", url: "https://rebootdemocracy.ai/blog/unboxing-the-prompt-how-community-feedback-and-ai-helped-us-build-better-ai-together" },
    ],
    sceneId: "aiep",
    flagship: true,
    screenshot: "/screenshots/a-iep.png",
    video: "/videos/a-iep-promo.mp4",
    year: "2024",
    kind: "ai",
    accentColor: "#E8845C",
    problem:
      "Special-education plans run 50-100 pages of legalese. Families — often non-English-speaking — couldn't parse the documents that decide their kids' support.",
    approach:
      "A 7-stage Step Functions pipeline: OCR, PII redaction via Comprehend (HIPAA/FERPA-aligned), parallel AI analysis, then translation into 4 languages — co-designed with the parents who use it.",
    tradeoff:
      "Redacting PII before analysis loses some context, but handling kids' education records means privacy is non-negotiable — so the pipeline is built around it.",
    architecture: {
      nodes: [
        { id: "family", label: "Family upload", type: "client" },
        { id: "s3", label: "S3", type: "storage" },
        { id: "sfn", label: "Step Functions", type: "compute" },
        { id: "comprehend", label: "Comprehend · PII", type: "security" },
        { id: "bedrock", label: "Bedrock analysis", type: "ai" },
        { id: "translate", label: "Translate · 4 lang", type: "ai" },
        { id: "dynamo", label: "DynamoDB", type: "data" },
      ],
      edges: [
        ["family", "s3"],
        ["s3", "sfn"],
        ["sfn", "comprehend"],
        ["comprehend", "bedrock"],
        ["bedrock", "translate"],
        ["translate", "dynamo"],
      ],
    },
  },
  {
    id: "vct-scout",
    name: "VCT Scout",
    subtitle: "2nd / 3,300+ Teams — AWS re:Invent 2024",
    description:
      "GenAI assistant built with AWS Bedrock Agents analyzing 1TB+ of Valorant Champions Tour game logs. Helps esports managers build competitive rosters through natural language queries over 4,700+ match files.",
    metrics: [
      { label: "Placement", value: "2nd / 3,300+" },
      { label: "Prize", value: "$16K total" },
      { label: "Game Logs", value: "1TB+" },
    ],
    techStack: ["AWS Bedrock Agents", "Claude API", "Athena", "React", "Python"],
    links: [
      { label: "Devpost", url: "https://devpost.com/software/vct-scout" },
      { label: "Northeastern News", url: "https://news.northeastern.edu/2025/02/04/valorant-hackathon-challenge-ai/" },
      { label: "GamesBeat", url: "https://gamesbeat.com/aws-and-riot-games-name-winner-of-valorant-champions-tour-hackathon/" },
      { label: "Amazon Press", url: "https://press.aboutamazon.com/2024/12/aws-and-riot-games-announce-the-winner-of-the-valorant-champions-tour-hackathon-esports-manager-challenge" },
    ],
    sceneId: "vct",
    flagship: true,
    screenshot: "/screenshots/vct-scout.png",
    video: "https://player.vimeo.com/video/1026644404?h=ba8c799d41",
    year: "2024",
    kind: "ai",
    accentColor: "#85B7EB",
    problem:
      "Esports managers drown in 1TB+ of match data when building rosters — the insight is buried in 4,700+ raw game-log files.",
    approach:
      "Bedrock Agents over Athena let managers ask in plain English ('find me an aggressive duelist on Ascent') and get answers grounded in the actual logs — with the agent's retrieval and analysis steps streamed live in the UI, so you watch it work.",
    tradeoff:
      "Built in a hackathon sprint — we optimized for a killer demo over completeness, and it landed 2nd of 3,300+ teams.",
    architecture: {
      nodes: [
        { id: "manager", label: "Esports manager", type: "client" },
        { id: "agent", label: "Bedrock Agent", type: "ai" },
        { id: "athena", label: "Athena", type: "compute" },
        { id: "logs", label: "1TB+ game logs", type: "storage" },
      ],
      edges: [
        ["manager", "agent"],
        ["agent", "athena"],
        ["athena", "logs"],
      ],
    },
  },
  {
    id: "one-l-abe",
    name: "One-L + ABE",
    subtitle: "AI-Powered Procurement Modernization",
    description:
      "One-L: Contract analysis using Claude via Bedrock with 11-stage Step Functions orchestration for conflict detection and redlining — 83% reduction in legal review time. ABE: Assistive Buyer Engine with RAGAS evaluation pipeline and CloudWatch observability.",
    metrics: [
      { label: "Legal Review Cut", value: "83%" },
      { label: "Pipeline Stages", value: "11" },
      { label: "CloudWatch Alarms", value: "8" },
    ],
    techStack: ["Claude via Bedrock", "AWS Step Functions", "RAGAS", "CloudWatch", "DynamoDB", "Lambda"],
    sceneId: "one-l",
    flagship: true,
    screenshot: "/screenshots/one-l.png",
    video: "/videos/abe-chat.mp4",
    videoAutoplay: true,
    year: "2025",
    kind: "ai",
    accentColor: "#A78BFA",
    award: "2025 NASPO Cronin Gold Award + Academic Collaboration Award",
    problem:
      "State procurement contracts take legal teams days to review for conflicts — a bottleneck on every public purchase.",
    approach:
      "An 11-stage Step Functions pipeline with Claude flags conflicts and proposes redlines; ABE adds a RAGAS evaluation loop (faithfulness, relevancy, precision, recall) so quality is measured, not assumed.",
    tradeoff:
      "AI-assisted, human-approved by design — lawyers stay in the loop, but review time still dropped 83%. It won the 2025 NASPO Cronin Gold Award.",
    architecture: {
      nodes: [
        { id: "contract", label: "Contract", type: "client" },
        { id: "s3", label: "S3", type: "storage" },
        { id: "sfn", label: "Step Functions · 11", type: "compute" },
        { id: "claude", label: "Claude · Bedrock", type: "ai" },
        { id: "ragas", label: "RAGAS eval", type: "compute" },
        { id: "cw", label: "CloudWatch", type: "data" },
      ],
      edges: [
        ["contract", "s3"],
        ["s3", "sfn"],
        ["sfn", "claude"],
        ["claude", "ragas"],
        ["ragas", "cw"],
      ],
    },
  },

  // === SECONDARY ===
  {
    id: "knowledge-agent",
    name: "knowledge-agent-for-impact",
    subtitle: "Reusable RAG Platform for Government",
    description:
      "Architected a reusable RAG platform using AWS CDK, Python, and OpenSearch Serverless — adopted across 10+ production deployments for state and municipal agencies. Shared LLM infrastructure that every other tool builds on.",
    metrics: [
      { label: "Deployments", value: "10+" },
      { label: "Agencies", value: "20+" },
      { label: "Users Served", value: "500K+" },
    ],
    techStack: ["AWS CDK", "Python", "OpenSearch Serverless", "Lambda", "DynamoDB"],
    sceneId: "knowledge-agent",
    flagship: false,
    kind: "ai",
  },
  {
    id: "smart-model",
    name: "Smart Model Selector",
    subtitle: "Intelligent Multi-Model Routing",
    description:
      "Lambda + API Gateway system routing queries across 14 AI models by task, cost, and token requirements — cutting costs by 40%. Benchmarked latency, cost, and instruction-following with in-house eval frameworks.",
    metrics: [
      { label: "Models", value: "14" },
      { label: "Cost Cut", value: "40%" },
    ],
    techStack: ["Lambda", "API Gateway", "Bedrock", "Python"],
    sceneId: "smart-model",
    flagship: false,
    kind: "ai",
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
    kind: "ai",
  },
  {
    id: "flutter-erp",
    name: "Acharya ERP",
    subtitle: "Where the shipping started — Flutter, Bangalore",
    description:
      "Cross-platform ERP app built in Flutter and grown from 100 to 20K+ daily users, lifting app-store ratings from 1.2 to 4.5. Owned design → development → deployment, then trained interns to take it over. The first thing I shipped that thousands of people relied on every day.",
    metrics: [
      { label: "Daily Users", value: "100 → 20K+" },
      { label: "App Rating", value: "1.2 → 4.5" },
      { label: "Years Owned", value: "2+" },
    ],
    techStack: ["Flutter", "Dart", "Firebase", "REST APIs", "Razorpay"],
    links: [
      {
        label: "The 20K-user analytics",
        url: "/photos/acharya-users.jpg",
      },
    ],
    sceneId: "flutter",
    flagship: false,
    kind: "swe",
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
