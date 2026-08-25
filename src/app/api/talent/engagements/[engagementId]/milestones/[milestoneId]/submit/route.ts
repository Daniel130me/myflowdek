import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { submitMilestoneSchema } from '@/server/talent/engagement.schemas';
import { submitMilestone } from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string; milestoneId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId, milestoneId } = await context.params;

    let bodyData = {};
    try {
      bodyData = await req.json();
    } catch {
      // Empty body is fine
    }

    const parsed = submitMilestoneSchema.safeParse(bodyData);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await submitMilestone(user.id, engagementId, milestoneId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements/:engagementId/milestones/:milestoneId/submit');
  }
}
