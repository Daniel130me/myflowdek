import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
  AuthError,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import { db } from '@/server/db/client';

/**
 * Time-log API — create and list time tracking entries for a task.
 *
 * Authorization: project membership is required to list, and the
 * `EDIT_TASK` capability is required to add a new entry. (We treat logging
 * time as a write/edit operation because it changes the task's aggregate
 * "time spent" value.)
 *
 * Schema (Prisma `TimeLog`):
 *   id, taskId, projectId, userId (nullable, onDelete: SetNull),
 *   minutes (int), note (nullable), loggedAt
 */

const timeLogSelect = {
  id: true,
  taskId: true,
  projectId: true,
  userId: true,
  minutes: true,
  note: true,
  loggedAt: true,
} as const;

const createTimeLogSchema = z.object({
  minutes: z.number().int().positive('minutes must be a positive integer'),
  note: z.string().trim().max(1000).optional(),
});

/** GET /api/tasks/:taskId/time-logs — list time logs for a task. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');

    const timeLogs = await db.timeLog.findMany({
      where: { taskId },
      select: timeLogSelect,
      orderBy: { loggedAt: 'asc' },
    });
    return NextResponse.json({ timeLogs });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/tasks/:taskId/time-logs — log time against a task. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    // Logging time is a write against the task → require EDIT_TASK.
    await requireProjectCapability(user.id, task.projectId, 'EDIT_TASK');

    const body = await request.json().catch(() => null);
    const parsed = createTimeLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const timeLog = await db.timeLog.create({
      data: {
        taskId,
        projectId: task.projectId,
        userId: user.id,
        minutes: parsed.data.minutes,
        note: parsed.data.note ?? null,
      },
      select: timeLogSelect,
    });
    return NextResponse.json({ timeLog }, { status: 201 });
  } catch (error) {
    if (error instanceof AuthError) {
      return authErrorResponse(error);
    }
    return authErrorResponse(error);
  }
}
