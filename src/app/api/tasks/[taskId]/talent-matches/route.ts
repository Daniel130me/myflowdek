import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { matchingService } from '@/server/talent/matching.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ taskId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    const matches = await matchingService.getTaskTalentMatches(taskId);
    return NextResponse.json({ matches });
  } catch (error) {
    return apiError(error, 'GET /api/tasks/:taskId/talent-matches');
  }
}
