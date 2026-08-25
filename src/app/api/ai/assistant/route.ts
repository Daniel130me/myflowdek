import { NextResponse } from 'next/server';
import { requireAuthenticatedUser, authErrorResponse } from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { z } from 'zod';

const assistantSchema = z.object({
  /** What the user is asking the assistant to do. */
  prompt: z.string().trim().min(1).max(2000),
  /** Optional project context (the assistant will use the project's tasks). */
  projectId: z.string().optional(),
});

/**
 * POST /api/ai/assistant
 *
 * AI assistant endpoint that uses the z-ai-web-dev-sdk to answer questions
 * about the user's tasks and projects. The assistant receives real task data
 * as context so its responses are grounded in the user's actual work.
 *
 * The SDK is used server-side only (never client-side) per the project rules.
 */
export async function POST(req: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const body = await req.json().catch(() => null);
    const parsed = assistantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const { prompt, projectId } = parsed.data;

    // Gather context: the user's assigned tasks (optionally scoped to a project).
    const tasks = await db.task.findMany({
      where: {
        assigneeId: user.id,
        status: { not: 'done' },
        ...(projectId ? { projectId } : {}),
      },
      select: { name: true, status: true, priority: true, dueDate: true, project: { select: { name: true } } },
      take: 20,
      orderBy: { updatedAt: 'desc' },
    });

    // Build a context summary for the AI.
    const taskSummary = tasks.length > 0
      ? tasks.map(t => `- ${t.name} (status: ${t.status}, priority: ${t.priority}, due: ${t.dueDate?.toISOString().slice(0, 10) ?? 'no due date'}, project: ${t.project.name})`).join('\n')
      : 'No active tasks assigned.';

    const systemPrompt = `You are the FlowDeck AI assistant. Help the user with their project management tasks. Here are the user's current active tasks:\n\n${taskSummary}\n\nAnswer concisely and helpfully. If the user asks about tasks they don't have, let them know.`;

    // Use the z-ai-web-dev-sdk (server-side only).
    const ZAI = (await import('z-ai-web-dev-sdk')).default;
    const zai = await ZAI.create();

    const response = await zai.chat.completions.create({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt },
      ],
    });

    const reply = response.choices[0]?.message?.content ?? 'I could not generate a response.';

    return NextResponse.json({ reply, contextTasks: tasks.length });
  } catch (e) {
    // If the AI SDK fails, return a graceful error.
    console.error('[ai/assistant] error:', e);
    return authErrorResponse(e);
  }
}
