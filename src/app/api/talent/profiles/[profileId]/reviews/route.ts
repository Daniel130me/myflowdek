import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { reviewService } from '@/server/talent/review.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ profileId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const { profileId } = await params;
    const data = await reviewService.getProfileReviewsAndMetrics(user.id, profileId);
    return NextResponse.json(data);
  } catch (error) {
    return apiError(error, 'GET /api/talent/profiles/:profileId/reviews');
  }
}
