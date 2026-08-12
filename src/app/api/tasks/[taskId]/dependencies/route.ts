import { NextResponse } from 'next/server';
import { z } from 'zod';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { getTask } from '@/server/tasks/task.service';
import {
  listDependencies,
  addDependency,
  removeDependency,
} from '@/server/tasks/task-relationships.service';

const addDependencySchema = z.object({
  dependsOnId: z.string().min(1, 'dependsOnId is required'),
});

/** GET /api/tasks/:taskId/dependencies — list blocking deps. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'VIEW_PROJECT');
    const dependencies = await listDependencies(taskId);
    return NextResponse.json({ dependencies });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** POST /api/tasks/:taskId/dependencies — add a dependency.
 *
 *  The service enforces same-project ownership for dependsOnId (cross-project
 *  dependencies are rejected) and walks the dependency graph with a DFS to
 *  reject cycles. */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'MANAGE_DEPENDENCIES');

    const body = await request.json().catch(() => null);
    const parsed = addDependencySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const dependency = await addDependency(taskId, parsed.data.dependsOnId);
    return NextResponse.json({ dependency }, { status: 201 });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** DELETE /api/tasks/:taskId/dependencies?dependsOnId=xxx — remove a dep. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ taskId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    const task = await getTask(taskId);
    await requireProjectCapability(user.id, task.projectId, 'MANAGE_DEPENDENCIES');

    const url = new URL(request.url);
    const dependsOnId = url.searchParams.get('dependsOnId');
    if (!dependsOnId) {
      return NextResponse.json(
        { error: 'dependsOnId query parameter is required' },
        { status: 400 },
      );
    }

    await removeDependency(taskId, dependsOnId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
