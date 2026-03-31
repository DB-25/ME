import { streamText, UIMessage, convertToModelMessages } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildSystemPrompt } from "@/lib/ai/system-prompt";
import { NextRequest } from "next/server";

// ---------------------------------------------------------------------------
// In-memory rate limiting: 20 messages per IP per hour
// ---------------------------------------------------------------------------

interface RateBucket {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateBucket>();

const RATE_LIMIT = 20;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = rateLimitMap.get(ip);

  // Clean up expired entries periodically
  if (Math.random() < 0.01) {
    for (const [key, val] of rateLimitMap) {
      if (val.resetAt <= now) rateLimitMap.delete(key);
    }
  }

  if (!bucket || bucket.resetAt <= now) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  if (bucket.count >= RATE_LIMIT) {
    return false;
  }

  bucket.count += 1;
  return true;
}

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
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous";

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
