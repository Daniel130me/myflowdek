import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { createTalentProposalSchema } from '@/server/talent/opportunity.schemas';
import {
  getOpportunityById,
  listProposalsForOpportunity,
  submitTalentProposal,
} from '@/server/talent/opportunity.service';

export async function GET(_request: Request, { params }: { params: Promise<{ opportunityId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { opportunityId } = await params;
    const opportunity = await getOpportunityById(opportunityId, user.id);

    // If current user is the creator/manager of the opportunity, return all proposals
    if (opportunity.createdBy.id === user.id) {
      const proposals = await listProposalsForOpportunity(opportunityId);
      return NextResponse.json({ proposals });
    }

    // Otherwise return empty array (or user's own proposals can be fetched via /api/talent/proposals/me)
    return NextResponse.json({ proposals: [] });
  } catch (error) {
    return apiError(error, 'GET /api/talent/opportunities/:opportunityId/proposals');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ opportunityId: string }> }) {
  try {
    const user = await requireAuthenticatedUser();
    const { opportunityId } = await params;
    const parsed = createTalentProposalSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return validationError(parsed.error);

    const proposal = await submitTalentProposal(opportunityId, user.id, parsed.data);
    return NextResponse.json({ proposal }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/talent/opportunities/:opportunityId/proposals');
  }
}
