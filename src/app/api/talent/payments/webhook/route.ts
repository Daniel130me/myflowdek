import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/server/talent/payment.service';
import { ServiceError } from '@/server/http/errors';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signatureHeader = req.headers.get('x-paystack-signature') || req.headers.get('stripe-signature') || '';

    let payload = {};
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const result = await paymentService.handleWebhookEvent(rawBody, signatureHeader, payload);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error('[Payment Webhook Error]:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}
