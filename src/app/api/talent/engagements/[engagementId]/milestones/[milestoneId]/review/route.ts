import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { reviewMilestoneSchema } from '@/server/talent/engagement.schemas';
import { reviewMilestone } from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string; milestoneId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId, milestoneId } = await context.params;
    const body = await req.json().catch(() => null);

    const parsed = reviewMilestoneSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await reviewMilestone(user.id, engagementId, milestoneId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements/:engagementId/milestones/:milestoneId/review');
  }
}
