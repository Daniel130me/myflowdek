import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import {
  listFollowers,
  addFollower,
  removeFollower,
} from '@/server/tasks/task-relationships.service';

/** GET /api/tasks/:taskId/followers — list followers. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');
    const followers = await listFollowers(taskId);
    return NextResponse.json({ followers });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/tasks/:taskId/followers — follow a task (self).
 *  Following is a self-action — any project member (VIEW_PROJECT) can follow
 *  a task they can see. */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');

    const follower = await addFollower(taskId, user.id);
    // Idempotent: if already following, follower is null → return success.
    return NextResponse.json(
      { ok: true, follower: follower ?? undefined },
      { status: follower ? 201 : 200 },
    );
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** DELETE /api/tasks/:taskId/followers — unfollow a task (self). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');

    await removeFollower(taskId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
