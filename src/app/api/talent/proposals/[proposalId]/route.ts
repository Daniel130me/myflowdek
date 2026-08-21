import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { updateTalentProposalSchema } from '@/server/talent/opportunity.schemas';
import { updateTalentProposal } from '@/server/talent/opportunity.service';

export async function PATCH(request: Request, { params }: { params: Promise<{ proposalId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { proposalId } = await params;
    const parsed = updateTalentProposalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const proposal = await updateTalentProposal(proposalId, user.id, parsed.data);
    return NextResponse.json({ proposal });
  } catch (error) {
    return apiError(error, 'PATCH /api/talent/proposals/:proposalId');
  }
}
