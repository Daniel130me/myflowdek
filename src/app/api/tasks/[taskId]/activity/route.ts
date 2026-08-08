import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import { listActivityForTask } from '@/server/activity/activity.service';

/**
 * GET /api/tasks/:taskId/activity
 *
 * Returns the business activity feed for a task (newest first). Any project
 * member can view the activity timeline.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectMember(user.id, task.projectId);

    const activity = await listActivityForTask(taskId);
    return NextResponse.json({ activity });
  } catch (error) {
    return authErrorResponse(error);
  }
}
