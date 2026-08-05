import ZAI from "z-ai-web-dev-sdk";

import { buildAiMessages } from "./prompts";
import type { AiRequest } from "./schemas";

export async function generateAiResponse(request: AiRequest) {
  const { systemPrompt, userPrompt } = buildAiMessages(request);

  if (!userPrompt.trim()) {
    throw new Error("Insufficient context to generate a response.");
  }

  const client = await ZAI.create();
  const response = await client.chat.completions.create({
    model: "default",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_tokens: 1024,
    temperature: 0.7,
  });

  return response.choices?.[0]?.message?.content ?? "I was unable to generate a response. Please try again.";
}
