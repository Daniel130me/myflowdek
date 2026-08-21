import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { moderationService } from '@/server/talent/moderation.service';
import { moderateProfileSchema } from '@/server/talent/moderation.schemas';
import { ServiceError } from '@/server/http/errors';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const parsed = moderateProfileSchema.parse(body);

    const result = await moderationService.moderateProfessionalProfile(session.user.id, parsed);
    return NextResponse.json(result);
  } catch (error: any) {
    if (error instanceof ServiceError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    if (error.name === 'ZodError') {
      return NextResponse.json({ error: 'Invalid moderation payload', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to perform moderation' }, { status: 500 });
  }
}
