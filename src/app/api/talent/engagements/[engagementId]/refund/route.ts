import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { paymentService } from '@/server/talent/payment.service';
import { requestRefundSchema } from '@/server/talent/payment.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ engagementId: string }> }
) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = requestRefundSchema.parse(body);

    const refund = await paymentService.requestOrProcessRefund(user.id, parsed);
    return NextResponse.json({ refund, message: 'Refund request sent to the payment provider' });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid input', details: error.errors }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
