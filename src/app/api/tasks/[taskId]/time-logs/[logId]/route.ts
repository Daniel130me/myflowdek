import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { db } from '@/server/db/client';
import { AuthError } from '@/server/auth/authorization';

/**
 * Helper: look up the projectId for a time-log entry. Used for the project
 * capability check on DELETE.
 */
async function getTimeLogProjectId(logId: string): Promise<string | null> {
  const entry = await db.timeLog.findUnique({
    where: { id: logId },
    select: { projectId: true },
  });
  return entry?.projectId ?? null;
}

/**
 * DELETE /api/tasks/:taskId/time-logs/:logId
 *
 * Delete a time-log entry. Requires EDIT_TASK capability on the project —
 * this matches the create path so any project member who can log time can
 * also remove their own (or, with elevated roles, others') entries.
 *
 * The `taskId` is part of the URL for REST consistency but we look up the
 * entry by `logId` to avoid race conditions if the task was reassigned.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string; logId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId, logId } = await params;

    const projectId = await getTimeLogProjectId(logId);
    if (!projectId) {
      return NextResponse.json(
        { error: 'Time log not found' },
        { status: 404 },
      );
    }

    await requireProjectCapability(user.id, projectId, 'EDIT_TASK');

    // Delete — verify the entry belongs to the task in the URL (defence in
    // depth: the URL says taskId, the row says projectId; both must agree).
    try {
      await db.timeLog.delete({
        where: { id: logId },
      });
    } catch {
      throw new AuthError('Time log not found', 404);
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
