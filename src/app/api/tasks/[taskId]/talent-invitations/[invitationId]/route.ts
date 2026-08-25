import { NextResponse } from 'next/server';

import { requireAuthenticatedUser, requireTaskProjectCapability } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { withdrawTaskTalentInvitation } from '@/server/talent/task-talent.service';

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ taskId: string; invitationId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { taskId, invitationId } = await params;
    await requireTaskProjectCapability(user.id, taskId, 'EDIT_TASK');
    return NextResponse.json(await withdrawTaskTalentInvitation(taskId, invitationId, user.id));
  } catch (error) {
    return apiError(error, 'DELETE /api/tasks/:taskId/talent-invitations/:invitationId');
  }
}
