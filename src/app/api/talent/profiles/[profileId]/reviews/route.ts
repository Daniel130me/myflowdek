import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/server/talent/review.service';
import { ServiceError } from '@/server/http/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ profileId: string }> }
) {
  const { profileId } = await params;

  try {
    const data = await reviewService.getProfileReviewsAndMetrics(profileId);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to fetch profile reviews and metrics' }, { status: 500 });
  }
}
