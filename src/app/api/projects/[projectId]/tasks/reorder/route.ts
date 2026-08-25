import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';

const reorderSchema = z.object({
  tasks: z.array(z.object({
    id: z.string(),
    sortOrder: z.number().int(),
  })).min(1),
});

/**
 * POST /api/projects/:projectId/tasks/reorder
 *
 * Transactionally updates sortOrder for multiple tasks in a single DB
 * transaction. Verifies every task ID belongs to the route project.
 *
 * Requires EDIT_TASK capability.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectCapability(user.id, projectId, 'EDIT_TASK');

    const body = await request.json().catch(() => null);
    const parsed = reorderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const taskIds = parsed.data.tasks.map(t => t.id);

    // Verify ALL task IDs belong to this project.
    const projectTasks = await db.task.findMany({
      where: { id: { in: taskIds }, projectId },
      select: { id: true },
    });
    if (projectTasks.length !== taskIds.length) {
      return NextResponse.json(
        { error: 'Some tasks do not belong to this project' },
        { status: 400 },
      );
    }

    // Transactional update — all or nothing.
    await db.$transaction(
      parsed.data.tasks.map(t =>
        db.task.update({
          where: { id: t.id },
          data: { sortOrder: t.sortOrder },
          select: { id: true },
        }),
      ),
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
