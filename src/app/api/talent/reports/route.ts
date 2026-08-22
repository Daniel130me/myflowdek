import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { moderationService } from '@/server/talent/moderation.service';
import { submitReportSchema } from '@/server/talent/moderation.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = submitReportSchema.parse(body);

    const result = await moderationService.submitReport(user.id, parsed);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid report details', details: error.errors }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
