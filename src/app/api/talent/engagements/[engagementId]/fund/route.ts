import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { paymentService } from '@/server/talent/payment.service';
import { initializePaymentSchema } from '@/server/talent/payment.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  const { engagementId } = await params;

  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = initializePaymentSchema.parse(body);

    const result = await paymentService.initializeEngagementPayment(
      user.id,
      engagementId,
      parsed
    );

    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid payload', details: error.errors }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
