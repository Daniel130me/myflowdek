import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { updateProfessionalProfileSchema } from '@/server/talent/profile.schemas';
import {
  createProfessionalProfile,
  updateOwnProfessionalProfile,
} from '@/server/talent/profile.service';

export async function POST() {
  try {
    const user = await requireAuthenticatedUser();
    const profile = await createProfessionalProfile(user);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/talent/profile');
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null);
    const parsed = updateProfessionalProfileSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const profile = await updateOwnProfessionalProfile(user.id, parsed.data);
    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error, 'PATCH /api/talent/profile');
  }
}
