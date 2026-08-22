import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { matchingService } from '@/server/talent/matching.service';

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    const data = await matchingService.suggestTaskCompetencies(taskId);
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error, 'POST /api/tasks/:taskId/suggest-competencies');
  }
}
