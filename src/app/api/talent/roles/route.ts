import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { listProfessionalRoles } from '@/server/talent/profile.service';

export async function GET() {
  try {
    await requireAuthenticatedUser();
    return NextResponse.json({ roles: await listProfessionalRoles() });
  } catch (error) {
    return apiError(error, 'GET /api/talent/roles');
  }
}
