import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { getOpportunityById } from '@/server/talent/opportunity.service';

export async function GET(_request: Request, { params }: { params: Promise<{ opportunityId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { opportunityId } = await params;
    const opportunity = await getOpportunityById(opportunityId, user.id);
    return NextResponse.json({ opportunity });
  } catch (error) {
    return apiError(error, 'GET /api/talent/opportunities/:opportunityId');
  }
}
