import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  authErrorResponse,
} from '@/server/auth/authorization';
import { listTasks, createTask } from '@/server/tasks/task.service';
import { createTaskSchema } from '@/server/tasks/schemas';

/** GET /api/projects/:projectId/tasks — list tasks. Any project member. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);
    const tasks = await listTasks(projectId);
    return NextResponse.json({ tasks });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/projects/:projectId/tasks — create task. createdById from session. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId } = await params;
    await requireProjectMember(user.id, projectId);

    const body = await request.json().catch(() => null);
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const task = await createTask(projectId, user.id, parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}
