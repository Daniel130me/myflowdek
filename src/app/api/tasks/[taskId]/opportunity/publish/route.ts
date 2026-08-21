import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { publishTaskOpportunity } from '@/server/talent/opportunity.service';

export async function POST(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    const opportunity = await publishTaskOpportunity(taskId, user.id);
    return NextResponse.json({ opportunity });
  } catch (error) {
    return apiError(error, 'POST /api/tasks/:taskId/opportunity/publish');
  }
}
