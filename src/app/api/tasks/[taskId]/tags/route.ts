import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import {
  listTaskTags,
  addTaskTag,
  removeTaskTag,
} from '@/server/tasks/task-relationships.service';

const addTagSchema = z.object({
  tagId: z.string().min(1, 'tagId is required'),
});

/** GET /api/tasks/:taskId/tags — list tags on the task. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');
    const tags = await listTaskTags(taskId);
    return NextResponse.json({ tags });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/tasks/:taskId/tags — apply a tag to the task. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'MANAGE_TAGS');

    const body = await request.json().catch(() => null);
    const parsed = addTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const tag = await addTaskTag(taskId, parsed.data.tagId, task.projectId);
    return NextResponse.json({ tag }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** DELETE /api/tasks/:taskId/tags?tagId=xxx — remove a tag from the task. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'MANAGE_TAGS');

    const url = new URL(request.url);
    const tagId = url.searchParams.get('tagId');
    if (!tagId) {
      return NextResponse.json(
        { error: 'tagId query parameter is required' },
        { status: 400 },
      );
    }

    await removeTaskTag(taskId, tagId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
