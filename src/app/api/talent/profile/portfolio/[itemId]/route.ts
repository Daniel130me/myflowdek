import { NextResponse } from 'next/server';

import { requireAuthenticatedUser } from '@/server/auth/authorization';
import { apiError, validationError } from '@/server/http/responses';
import { updatePortfolioItemSchema } from '@/server/talent/profile.schemas';
import { deletePortfolioItem, updatePortfolioItem } from '@/server/talent/profile.service';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { itemId } = await params;
    const body = await request.json().catch(() => null);
    const parsed = updatePortfolioItemSchema.safeParse(body);
    if (!parsed.success) return validationError(parsed.error);

    const item = await updatePortfolioItem(user.id, itemId, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    return apiError(error, 'PATCH /api/talent/profile/portfolio/:itemId');
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ itemId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { itemId } = await params;
    await deletePortfolioItem(user.id, itemId);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return apiError(error, 'DELETE /api/talent/profile/portfolio/:itemId');
  }
}
