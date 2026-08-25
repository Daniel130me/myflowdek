import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { listOwnTalentInvitations } from '@/server/talent/task-talent.service';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    return NextResponse.json({ invitations: await listOwnTalentInvitations(user.id) });
  } catch (error) {
    return apiError(error, 'GET /api/talent/invitations');
  }
}
