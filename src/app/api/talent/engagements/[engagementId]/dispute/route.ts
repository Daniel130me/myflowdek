import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { disputeEngagementSchema } from '@/server/talent/engagement.schemas';
import { disputeEngagement } from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId } = await context.params;
    const body = await req.json().catch(() => null);

    const parsed = disputeEngagementSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await disputeEngagement(user.id, engagementId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements/:engagementId/dispute');
  }
}
