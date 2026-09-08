import { NextResponse } from "next/server";

import { aiRequestSchema } from "@/server/ai/schemas";
import { generateAiResponse } from "@/server/ai/service";
import {
  requireAuthenticatedUser,
  authErrorResponse,
  AuthError,
} from "@/server/auth/authorization";
import { rateLimit, getClientId, retryAfterSeconds } from "@/lib/rate-limit";

/**
 * POST /api/ai — LLM generation for authenticated users.
 *
 * Audit H-22: this route previously had no session check and no rate limit,
 * so any anonymous visitor could drive paid LLM calls. It now requires a
 * session (matching /api/ai/assistant), rate-limits per IP, and never
 * returns raw SDK error text to the client.
 */
export async function POST(request: Request) {
  try {
    await requireAuthenticatedUser();

    const clientId = getClientId(request);
    const rl = rateLimit(`ai:${clientId}`, { maxRequests: 10, windowMs: 60_000 });
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSeconds(rl.retryAfterMs ?? 0)) } },
      );
    }

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
    // Auth errors keep their proper status; everything else is a generic 502
    // — raw provider messages must not leak to clients.
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    console.error("AI API error:", error);
    return NextResponse.json(
      { error: "Unable to contact the AI service right now." },
      { status: 502 },
    );
  }
}
