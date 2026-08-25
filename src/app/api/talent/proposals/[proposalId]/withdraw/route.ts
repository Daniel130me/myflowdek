import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { withdrawTalentProposal } from '@/server/talent/opportunity.service';

export async function POST(_request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { proposalId } = await params;
    const proposal = await withdrawTalentProposal(proposalId, user.id);
    return NextResponse.json({ proposal });
  } catch (error) {
    return apiError(error, 'POST /api/talent/proposals/:proposalId/withdraw');
  }
}
