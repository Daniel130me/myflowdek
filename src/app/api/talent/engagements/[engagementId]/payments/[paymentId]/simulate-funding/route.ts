import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { paymentService } from '@/server/talent/payment.service';
import { ServiceError } from '@/server/http/errors';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ engagementId: string; paymentId: string }> }
) {
  const { paymentId } = await params;

  try {
    const user = await requireAuthenticatedUser();
    const payment = await paymentService.simulateSandboxFunding(user.id, paymentId);
    return NextResponse.json({ payment, message: 'Funding simulated successfully in sandbox' });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}
