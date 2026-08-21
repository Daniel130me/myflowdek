import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { portfolioItemSchema } from '@/server/talent/profile.schemas';
import { createPortfolioItem } from '@/server/talent/profile.service';

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();
    const body = await request.json().catch(() => null);
    const parsed = portfolioItemSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const item = await createPortfolioItem(user.id, parsed.data);
    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    return apiError(error, 'POST /api/talent/profile/portfolio');
  }
}
