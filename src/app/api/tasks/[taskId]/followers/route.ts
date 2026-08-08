import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
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
    await requireProjectMember(user.id, task.projectId);
    const followers = await listFollowers(taskId);
    return NextResponse.json({ followers });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/tasks/:taskId/followers — follow a task (self). */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectMember(user.id, task.projectId);

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
    await requireProjectMember(user.id, task.projectId);

    await removeFollower(taskId, user.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
