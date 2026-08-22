import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { reviewService } from '@/server/talent/review.service';
import { createProfessionalReviewSchema } from '@/server/talent/review.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const { engagementId } = await params;

  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = createProfessionalReviewSchema.parse(body);

    const review = await reviewService.submitProfessionalReview(
      user.id,
      engagementId,
      parsed
    );

    return NextResponse.json({ review, message: 'Review submitted successfully' });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid review parameters', details: error.errors }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
