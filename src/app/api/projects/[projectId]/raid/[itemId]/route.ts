import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { updateRaidItem, deleteRaidItem, updateRaidItemSchema } from '@/server/raid/raid.service';

/**
 * RAID item endpoints (audit C-01).
 *
 * PATCH  /api/projects/:projectId/raid/:itemId — update an item.
 * DELETE /api/projects/:projectId/raid/:itemId — delete an item.
 * Both require MANAGE_RAID and are scoped to the project in the WHERE clause.
 */

/** PATCH /api/projects/:projectId/raid/:itemId — update a RAID item. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, itemId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_RAID');

    const body = await request.json().catch(() => null);
    const parsed = updateRaidItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const item = await updateRaidItem(projectId, itemId, parsed.data);
    return NextResponse.json({ item });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/** DELETE /api/projects/:projectId/raid/:itemId — delete a RAID item. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, itemId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_RAID');

    await deleteRaidItem(projectId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
