import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { createTalentInvitationSchema } from '@/server/talent/task-talent.schemas';
import { createTaskTalentInvitation, listTaskTalentInvitations } from '@/server/talent/task-talent.service';

export async function GET(_request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    return NextResponse.json({ invitations: await listTaskTalentInvitations(taskId) });
  } catch (error) {
    return apiError(error, 'GET /api/tasks/:taskId/talent-invitations');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    const parsed = createTalentInvitationSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);
    const invitation = await createTaskTalentInvitation(taskId, user.id, parsed.data);
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/tasks/:taskId/talent-invitations');
  }
}
