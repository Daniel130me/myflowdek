import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { deleteStatusUpdate } from '@/server/status-updates/status-update.service';
import { db } from '@/server/db/client';

/**
 * Verify the status update belongs to the project in the URL — prevents IDOR
 * where a member of project A could delete status updates in project B by
 * guessing the updateId. Returns 404 if missing or mismatched.
 */
async function verifyUpdateInProject(
  updateId: string,
  projectId: string,
): Promise<boolean> {
  const update = await db.projectStatusUpdate.findUnique({
    where: { id: updateId },
    select: { projectId: true },
  });
  return !!update && update.projectId === projectId;
}

/**
 * DELETE /api/projects/:projectId/status-updates/:updateId
 *
 * Delete a pinned status update. Requires MANAGE_STATUS_UPDATES capability.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; updateId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, updateId } = await params;
    await requireProjectCapability(user.id, projectId, 'MANAGE_STATUS_UPDATES');

    if (!(await verifyUpdateInProject(updateId, projectId))) {
      return NextResponse.json({ error: 'Status update not found' }, { status: 404 });
    }

    await deleteStatusUpdate(updateId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
