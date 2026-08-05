import { NextResponse } from "next/server";

import { aiRequestSchema } from "@/server/ai/schemas";
import { generateAiResponse } from "@/server/ai/service";

export async function POST(request: Request) {
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
    const message = error instanceof Error ? error.message : "Unable to contact the AI service.";
    return NextResponse.json({ message }, { status: 500 });
  }
}
