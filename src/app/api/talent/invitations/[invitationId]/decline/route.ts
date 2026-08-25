import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { respondToOwnTalentInvitation } from '@/server/talent/task-talent.service';

export async function POST(_request: Request, { params }: { params: Promise<{ invitationId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { invitationId } = await params;
    return NextResponse.json({ invitation: await respondToOwnTalentInvitation(user.id, invitationId, 'DECLINED') });
  } catch (error) {
    return apiError(error, 'POST /api/talent/invitations/:invitationId/decline');
  }
}
