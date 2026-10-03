import type { StackGroup } from "./types";

// Only tools with evidence in shipped projects, the resume or the repos.
export const stack: StackGroup[] = [
  {
    name: "Models and agents",
    items: [
      "Claude via Amazon Bedrock",
      "OpenAI",
      "Mistral OCR",
      "Titan embeddings",
      "RAG",
      "RAGAS evaluation",
      "Tool-use agents",
      "Prompt engineering",
      "LangChain",
      "PyTorch",
      "TensorFlow",
    ],
  },
  {
    name: "AWS and infrastructure",
    items: [
      "Step Functions",
      "Lambda",
      "API Gateway and WebSocket APIs",
      "Cognito",
      "DynamoDB",
      "S3",
      "KMS",
      "Comprehend",
      "OpenSearch Serverless",
      "CloudFront and WAF",
      "CloudWatch",
      "SES",
      "AWS CDK",
    ],
  },
  {
    name: "Languages",
    items: ["Python", "TypeScript", "JavaScript", "Dart", "Java", "C++", "SQL"],
  },
  {
    name: "Web and mobile",
    items: ["React", "Next.js", "Vite", "Tailwind CSS", "MUI", "FastAPI", "Hono", "Flutter"],
  },
  {
    name: "Data and search",
    items: ["PostgreSQL", "DynamoDB", "Weaviate", "OpenSearch", "FAISS", "Pinecone", "Neo4j", "Athena"],
  },
  {
    name: "Quality and tooling",
    items: [
      "GitHub Actions",
      "Docker",
      "Jest",
      "Vitest",
      "pytest",
      "Playwright",
      "Model Context Protocol",
      "Claude Code",
    ],
  },
];
