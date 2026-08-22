import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { reviewService } from '@/server/talent/review.service';
import { ServiceError } from '@/server/http/errors';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const { engagementId } = await params;

  try {
    const user = await requireAuthenticatedUser();
    const data = await reviewService.getEngagementReviews(user.id, engagementId);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}
