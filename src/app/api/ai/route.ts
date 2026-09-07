import { NextResponse } from "next/server";

import { aiRequestSchema } from "@/server/ai/schemas";
import { generateAiResponse } from "@/server/ai/service";
import { requireAuthenticatedUser, authErrorResponse } from "@/server/auth/authorization";
import { checkMutationLimit, RATE_LIMITS } from "@/lib/rate-limit";

/**
 * POST /api/ai
 *
 * General AI text generation used by the AI Assistant view.
 *
 * This endpoint drives paid LLM usage, so it is gated twice:
 *   1. Authentication — anonymous requests are rejected with 401
 *      (mirrors the sibling /api/ai/assistant route).
 *   2. Rate limit — per-client sliding window to cap spend per caller.
 *
 * Upstream SDK failures are logged server-side and returned as a generic
 * 502 so raw provider error messages never reach the client.
 */
export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();
  } catch (error) {
    return authErrorResponse(error);
  }

  const limited = checkMutationLimit(request, RATE_LIMITS.aiGenerate, "ai-generate");
  if (limited) return limited;

  try {
    const body: unknown = await request.json();
    const parsed = aiRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { message: "Invalid AI request.", issues: parsed.error.flatten().fieldErrors },
        { status: 400 },
      );
    }

    const message = await generateAiResponse(parsed.data);
    return NextResponse.json({ message });
  } catch (error) {
    console.error("AI API error:", error);
    return NextResponse.json(
      { message: "The AI service is temporarily unavailable. Please try again." },
      { status: 502 },
    );
  }
}
