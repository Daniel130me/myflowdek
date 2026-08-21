import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { declineEngagement } from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId } = await context.params;

    let reason: string | undefined;
    try {
      const body = await req.json();
      reason = body.reason;
    } catch {
      // Reason is optional
    }

    const result = await declineEngagement(user.id, engagementId, reason);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements/:engagementId/decline');
  }
}
