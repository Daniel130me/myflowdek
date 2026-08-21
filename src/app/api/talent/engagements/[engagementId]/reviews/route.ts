import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewService } from '@/server/talent/review.service';
import { ServiceError } from '@/server/http/errors';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { engagementId } = await params;

  try {
    const data = await reviewService.getEngagementReviews(session.user.id, engagementId);
    return NextResponse.json(data);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json({ error: 'Failed to fetch engagement reviews' }, { status: 500 });
  }
}
