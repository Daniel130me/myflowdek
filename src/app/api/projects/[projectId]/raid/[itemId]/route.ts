import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  deleteRaidItem,
  updateRaidItem,
  updateRaidItemSchema,
} from '@/server/raid/raid.service';

/**
 * PATCH /api/projects/:projectId/raid/:itemId — update a RAID item
 * (status transitions, owner, impact, description). Project-scoped: the
 * service verifies the item belongs to the path's project. Requires
 * EDIT_TASK.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, itemId } = await params;
    await requireProjectCapability(user.id, projectId, 'EDIT_TASK');

    const parsed = updateRaidItemSchema.safeParse(await request.json().catch(() => null));
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

/**
 * DELETE /api/projects/:projectId/raid/:itemId — remove a RAID item.
 * Requires EDIT_TASK.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; itemId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, itemId } = await params;
    await requireProjectCapability(user.id, projectId, 'EDIT_TASK');

    await deleteRaidItem(projectId, itemId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
