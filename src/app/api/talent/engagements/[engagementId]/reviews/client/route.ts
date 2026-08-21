import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { reviewService } from '@/server/talent/review.service';
import { createClientReviewSchema } from '@/server/talent/review.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { engagementId } = await params;

  try {
    const body = await req.json();
    const parsed = createClientReviewSchema.parse(body);

    const review = await reviewService.submitClientReview(
      session.user.id,
      engagementId,
      parsed
    );

    return NextResponse.json({ review, message: 'Client review submitted successfully' });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid review parameters', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to submit client review' }, { status: 500 });
  }
}
