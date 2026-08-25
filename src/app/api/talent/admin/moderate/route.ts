import { NextRequest, NextResponse } from 'next/server';
import { authErrorResponse, requireAuthenticatedUser } from '@/server/auth/authorization';
import { moderationService } from '@/server/talent/moderation.service';
import { moderateProfileSchema } from '@/server/talent/moderation.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await req.json();
    const parsed = moderateProfileSchema.parse(body);

    const result = await moderationService.moderateProfessionalProfile(user.id, parsed);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid moderation payload', details: error.errors }, { status: 400 });
    }
    return authErrorResponse(error);
  }
}
