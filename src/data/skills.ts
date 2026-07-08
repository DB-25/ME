export interface Skill {
  name: string;
  category: string;
  proficiency: number; // 0-1
  connections: string[];
}

export const skillCategories = [
  { id: "llm", label: "LLM / ML", color: "#A78BFA" },
  { id: "cloud", label: "Cloud & DevOps", color: "#85B7EB" },
  { id: "languages", label: "Languages", color: "#5DCAA5" },
  { id: "data", label: "Data & Search", color: "#E8845C" },
  { id: "frameworks", label: "Frameworks", color: "#F0997B" },
] as const;

export const skills: Skill[] = [
  // LLM / ML
  { name: "Claude (Anthropic)", category: "llm", proficiency: 0.95, connections: ["AWS Bedrock", "Prompt Engineering", "RAG"] },
  { name: "AWS Bedrock", category: "llm", proficiency: 0.95, connections: ["Claude (Anthropic)", "Lambda", "Step Functions"] },
  { name: "OpenAI", category: "llm", proficiency: 0.9, connections: ["LangChain", "RAG", "Prompt Engineering"] },
  { name: "LangChain", category: "llm", proficiency: 0.9, connections: ["OpenAI", "RAG", "FAISS", "Python"] },
  { name: "RAG", category: "llm", proficiency: 0.95, connections: ["LangChain", "OpenSearch", "FAISS", "Pinecone"] },
  { name: "RAGAS", category: "llm", proficiency: 0.85, connections: ["RAG", "Claude (Anthropic)", "Python"] },
  { name: "Prompt Engineering", category: "llm", proficiency: 0.95, connections: ["Claude (Anthropic)", "OpenAI"] },
  { name: "Multi-Agent Orchestration", category: "llm", proficiency: 0.9, connections: ["Step Functions", "Claude (Anthropic)", "Lambda"] },
  { name: "PyTorch", category: "llm", proficiency: 0.8, connections: ["Python", "TensorFlow"] },
  { name: "TensorFlow", category: "llm", proficiency: 0.75, connections: ["Python", "PyTorch"] },

  // Cloud & DevOps
  { name: "Lambda", category: "cloud", proficiency: 0.95, connections: ["API Gateway", "DynamoDB", "S3", "Python"] },
  { name: "S3", category: "cloud", proficiency: 0.95, connections: ["Lambda", "CloudFront", "KMS"] },
  { name: "DynamoDB", category: "cloud", proficiency: 0.9, connections: ["Lambda", "API Gateway"] },
  { name: "Cognito", category: "cloud", proficiency: 0.85, connections: ["API Gateway", "Lambda"] },
  { name: "API Gateway", category: "cloud", proficiency: 0.9, connections: ["Lambda", "Cognito", "CloudFront"] },
  { name: "CloudFront", category: "cloud", proficiency: 0.85, connections: ["S3", "API Gateway"] },
  { name: "KMS", category: "cloud", proficiency: 0.85, connections: ["S3", "DynamoDB"] },
  { name: "Comprehend", category: "cloud", proficiency: 0.85, connections: ["Lambda", "Step Functions"] },
  { name: "OpenSearch", category: "cloud", proficiency: 0.9, connections: ["RAG", "Lambda"] },
  { name: "AWS CDK", category: "cloud", proficiency: 0.9, connections: ["Lambda", "DynamoDB", "S3", "TypeScript"] },
  { name: "Step Functions", category: "cloud", proficiency: 0.9, connections: ["Lambda", "Multi-Agent Orchestration"] },
  { name: "Docker", category: "cloud", proficiency: 0.8, connections: ["GitHub Actions"] },
  { name: "GitHub Actions", category: "cloud", proficiency: 0.85, connections: ["Docker", "AWS CDK"] },
  { name: "CloudWatch", category: "cloud", proficiency: 0.85, connections: ["Lambda", "API Gateway"] },
  { name: "ECS", category: "cloud", proficiency: 0.8, connections: ["Docker", "AWS CDK"] },
  { name: "Kubernetes", category: "cloud", proficiency: 0.7, connections: ["Docker"] },
  { name: "Azure OpenAI", category: "cloud", proficiency: 0.75, connections: ["OpenAI"] },
  { name: "GCP Vertex AI", category: "cloud", proficiency: 0.7, connections: ["Python"] },

  // Languages
  { name: "Python", category: "languages", proficiency: 0.95, connections: ["LangChain", "PyTorch", "Lambda"] },
  { name: "TypeScript", category: "languages", proficiency: 0.85, connections: ["React", "AWS CDK"] },
  { name: "Dart (Flutter)", category: "languages", proficiency: 0.85, connections: ["React"] },
  { name: "JavaScript", category: "languages", proficiency: 0.85, connections: ["React", "TypeScript"] },
  { name: "Java", category: "languages", proficiency: 0.7, connections: ["SQL"] },
  { name: "C++", category: "languages", proficiency: 0.7, connections: [] },
  { name: "SQL", category: "languages", proficiency: 0.8, connections: ["PostgreSQL", "DynamoDB"] },

  // Data & Search
  { name: "PostgreSQL", category: "data", proficiency: 0.8, connections: ["SQL", "Python"] },
  { name: "Pinecone", category: "data", proficiency: 0.85, connections: ["RAG", "LangChain"] },
  { name: "FAISS", category: "data", proficiency: 0.85, connections: ["RAG", "LangChain", "Python"] },
  { name: "Neo4j", category: "data", proficiency: 0.7, connections: ["Python"] },

  // Frameworks
  { name: "React", category: "frameworks", proficiency: 0.8, connections: ["TypeScript", "JavaScript"] },
  { name: "Claude Code", category: "frameworks", proficiency: 0.85, connections: ["Claude (Anthropic)"] },
];
