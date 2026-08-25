import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { paymentService } from '@/server/talent/payment.service';
import { connectPaymentAccountSchema } from '@/server/talent/payment.schemas';
import { ServiceError } from '@/server/http/errors';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const account = await paymentService.getProfessionalPaymentAccount(user.id);
    return NextResponse.json({ account });
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return authErrorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = connectPaymentAccountSchema.parse(body);

    const account = await paymentService.saveProfessionalPaymentAccount(user.id, parsed);
    return NextResponse.json({ account, message: 'Payout account connected successfully' });
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
