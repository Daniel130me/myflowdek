import { NextRequest, NextResponse } from 'next/server';
import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { submitDeliverableSchema } from '@/server/talent/engagement.schemas';
import { submitDeliverable } from '@/server/talent/engagement.service';

interface RouteContext {
  params: Promise<{ engagementId: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuthenticatedUser();
    const { engagementId } = await context.params;
    const body = await req.json().catch(() => null);

    const parsed = submitDeliverableSchema.safeParse(body);
    if (!parsed.success) {
      return validationError(parsed.error);
    }

    const result = await submitDeliverable(user.id, engagementId, parsed.data);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/talent/engagements/:engagementId/deliverables');
  }
}
