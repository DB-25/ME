import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { checkRateLimit, ipFromHeaders } from "@/lib/ai/rate-limit";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// POST /api/chat
// ---------------------------------------------------------------------------

export async function POST(request: NextRequest) {
  // Check for API key
  if (!process.env.OPENAI_API_KEY) {
    return Response.json(
      { error: "AI is not configured yet" },
      { status: 503 }
    );
  }

  // Rate limiting
  const ip = ipFromHeaders(request.headers);

  if (!checkRateLimit(ip)) {
    return Response.json(
      { error: "Rate limit exceeded. Please try again later." },
      { status: 429 }
    );
  }

  try {
    const { messages } = (await request.json()) as {
      messages: UIMessage[];
    };

    const systemPrompt = buildSystemPrompt();

    // Convert UI messages to model messages for streamText
    const modelMessages = await convertToModelMessages(messages);

    const result = streamText({
      model: openai("gpt-4o"),
      system: systemPrompt,
      messages: modelMessages,
    });

    return result.toUIMessageStreamResponse();
  } catch (err) {
    console.error("[chat] Error:", err);
    return Response.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
