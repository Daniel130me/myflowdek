import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { listOwnProposals } from '@/server/talent/opportunity.service';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const proposals = await listOwnProposals(user.id);
    return NextResponse.json({ proposals });
  } catch (error) {
    return apiError(error, 'GET /api/talent/proposals/me');
  }
}
