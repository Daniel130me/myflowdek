import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { publishOwnProfessionalProfile } from '@/server/talent/profile.service';

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    const profile = await publishOwnProfessionalProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error, 'POST /api/talent/profile/publish');
  }
}
