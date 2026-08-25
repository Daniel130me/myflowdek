import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { getOwnProfessionalProfile } from '@/server/talent/profile.service';

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const profile = await getOwnProfessionalProfile(user.id);
    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error, 'GET /api/talent/profile/me');
  }
}
