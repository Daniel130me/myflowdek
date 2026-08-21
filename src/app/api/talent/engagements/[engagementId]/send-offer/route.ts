import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { sendEngagementOfferSchema } from '@/server/talent/engagement.schemas';
import { sendEngagementOffer } from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId } = await context.params;

    let bodyData = {};
    try {
      bodyData = await req.json();
    } catch {
      // Empty body is acceptable
    }

    const parsed = sendEngagementOfferSchema.safeParse(bodyData);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await sendEngagementOffer(user.id, engagementId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements/:engagementId/send-offer');
  }
}
