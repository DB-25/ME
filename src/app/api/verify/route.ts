import { generateText } from "ai";
import { openai } from "@ai-sdk/openai";
import { checkRateLimit, ipFromHeaders } from "@/lib/ai/rate-limit";
import { NextRequest } from "next/server";

/**
 * POST /api/verify — real (cheap) groundedness check for the DB-1 glass box.
 *
 * Body:    { question: string, answer: string, sources: string[] }
 * Returns: { faithfulness: number, relevancy: number }   // both 0..1
 *
 * Non-critical by design: any failure returns a non-200 and the UI simply
 * omits the scores. Never fabricate on the client.
 */

const TIMEOUT_MS = 6000;

export async function POST(request: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return Response.json({ error: "not configured" }, { status: 503 });
  }

  const ip = ipFromHeaders(request.headers);
  if (!checkRateLimit(ip)) {
    return Response.json({ error: "rate limited" }, { status: 429 });
  }

  try {
    const { question, answer, sources } = (await request.json()) as {
      question?: string;
      answer?: string;
      sources?: string[];
    };

    if (!question || !answer || !Array.isArray(sources)) {
      return Response.json({ error: "bad request" }, { status: 400 });
    }

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      system:
        "You are an evaluation function. Score the ANSWER against the QUESTION and SOURCES. " +
        'Respond with ONLY a JSON object: {"faithfulness": <0..1>, "relevancy": <0..1>}. ' +
        "faithfulness = fraction of answer claims supported by the sources. " +
        "relevancy = how directly the answer addresses the question. No prose.",
      prompt: `QUESTION:\n${question.slice(0, 500)}\n\nSOURCES:\n${sources
        .slice(0, 6)
        .join("\n")
        .slice(0, 2000)}\n\nANSWER:\n${answer.slice(0, 2000)}`,
    });

    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return Response.json({ error: "unparseable" }, { status: 502 });

    const parsed = JSON.parse(match[0]) as {
      faithfulness?: number;
      relevancy?: number;
    };
    const clamp = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n)
        ? Math.max(0, Math.min(1, n))
        : null;

    const faithfulness = clamp(parsed.faithfulness);
    const relevancy = clamp(parsed.relevancy);
    if (faithfulness === null || relevancy === null) {
      return Response.json({ error: "invalid scores" }, { status: 502 });
    }

    return Response.json({ faithfulness, relevancy });
  } catch {
    return Response.json({ error: "eval failed" }, { status: 500 });
  }
}
