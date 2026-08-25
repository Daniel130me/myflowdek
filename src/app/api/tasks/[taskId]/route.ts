import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  requireTaskAccess,
  authErrorResponse,
} from '@/server/auth/authorization';
import { deleteTask, getExternalProfessionalTask, getTask, updateTask } from '@/server/tasks/task.service';
import { updateTaskSchema } from '@/server/tasks/schemas';

/** GET /api/tasks/:taskId — get a single task. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const access = await requireTaskAccess(user.id, taskId, 'VIEW_PROJECT');
    const task = access.accessType === 'EXTERNAL_CONTRACTOR'
      ? await getExternalProfessionalTask(taskId)
      : await getTask(taskId);
    return NextResponse.json({ task });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** PATCH /api/tasks/:taskId — update a task. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'EDIT_TASK');

    const body = await request.json().catch(() => null);
    const parsed = updateTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const updated = await updateTask(taskId, parsed.data, user.id);
    return NextResponse.json({ task: updated });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** DELETE /api/tasks/:taskId — delete a task. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'DELETE_TASK');
    await deleteTask(taskId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
