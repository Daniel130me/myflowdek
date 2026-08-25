import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { readProfessionalDirectoryQuery } from '@/server/talent/directory.schemas';
import { listPublishedProfessionals } from '@/server/talent/directory.service';

export async function GET(request: Request) {
  try {
    await requireAuthenticatedUser();
    const parsed = readProfessionalDirectoryQuery(new URL(request.url).searchParams);
    if (!parsed.success) return validationError(parsed.error);

    return NextResponse.json(await listPublishedProfessionals(parsed.data));
  } catch (error) {
    return apiError(error, 'GET /api/talent/professionals');
  }
}
