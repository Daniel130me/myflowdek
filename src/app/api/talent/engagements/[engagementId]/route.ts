import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { updateEngagementSchema } from '@/server/talent/engagement.schemas';
import {
  getEngagementDetail,
  updateDraftEngagement,
} from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId } = await context.params;

    const engagement = await getEngagementDetail(user.id, engagementId);
    return NextResponse.json(engagement);
  } catch (error) {
    return apiError(error, 'GET /api/talent/engagements/:engagementId');
  }
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId } = await context.params;
    const body = await req.json().catch(() => null);

    const parsed = updateEngagementSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const updated = await updateDraftEngagement(user.id, engagementId, parsed.data);
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error, 'PATCH /api/talent/engagements/:engagementId');
  }
}
