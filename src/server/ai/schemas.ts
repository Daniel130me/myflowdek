import { z } from "zod";

export const aiRequestTypes = [
  "summarize",
  "suggest_assignee",
  "risk_analysis",
  "smart_breakdown",
  "chat",
] as const;

export const aiRequestSchema = z.object({
  type: z.enum(aiRequestTypes),
  context: z.record(z.string(), z.unknown()),
});

export type AiRequest = z.infer<typeof aiRequestSchema>;
export type AiRequestType = AiRequest["type"];
