import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError } from '@/server/http/responses';
import { requirePublishedProfessionalBySlug } from '@/server/talent/directory.service';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    await requireAuthenticatedUser();
    const { slug } = await params;
    const profile = await requirePublishedProfessionalBySlug(slug);
    return NextResponse.json({ profile });
  } catch (error) {
    return apiError(error, 'GET /api/talent/professionals/:slug');
  }
}
