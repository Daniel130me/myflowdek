import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { replaceTaskCompetenciesSchema } from '@/server/talent/task-talent.schemas';
import { listTaskCompetencies, replaceTaskCompetencies } from '@/server/talent/task-talent.service';

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'VIEW_PROJECT');
    return NextResponse.json({ requirements: await listTaskCompetencies(taskId) });
  } catch (error) {
    return apiError(error, 'GET /api/tasks/:taskId/competencies');
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    const parsed = replaceTaskCompetenciesSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    return NextResponse.json({ requirements: await replaceTaskCompetencies(taskId, parsed.data) });
  } catch (error) {
    return apiError(error, 'PUT /api/tasks/:taskId/competencies');
  }
}
