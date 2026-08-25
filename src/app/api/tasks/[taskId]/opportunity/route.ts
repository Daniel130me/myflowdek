import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { upsertTalentOpportunitySchema } from '@/server/talent/opportunity.schemas';
import { getTaskOpportunity, upsertTaskOpportunity } from '@/server/talent/opportunity.service';

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'VIEW_PROJECT');
    const opportunity = await getTaskOpportunity(taskId);
    return NextResponse.json({ opportunity });
  } catch (error) {
    return apiError(error, 'GET /api/tasks/:taskId/opportunity');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    const parsed = upsertTalentOpportunitySchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const opportunity = await upsertTaskOpportunity(taskId, user.id, parsed.data);
    return NextResponse.json({ opportunity });
  } catch (error) {
    return apiError(error, 'POST /api/tasks/:taskId/opportunity');
  }
}
