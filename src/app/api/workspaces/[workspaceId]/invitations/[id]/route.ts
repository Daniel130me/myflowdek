import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import { revokeInvitation } from '@/server/invitations/service';
import { db } from '@/server/db/client';

/**
 * DELETE /api/workspaces/:workspaceId/invitations/:id
 *
 * Revoke a pending invitation. OWNER/ADMIN only. Marks the invitation as
 * REVOKED (keeps the row for audit) rather than hard-deleting.
 *
 * IDOR guard: verifies the invitation belongs to the workspace in the URL
 * before revoking.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; id: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, id } = await params;

    await requireWorkspaceCapability(user.id, workspaceId, 'INVITE_MEMBERS');

    // IDOR guard: verify the invitation belongs to this workspace before
    // revoking. (revokeInvitation also checks internally, but verifying at
    // the route level gives us a clean 404 without leaking existence.)
    const invitation = await db.invitation.findUnique({
      where: { id },
      select: { workspaceId: true },
    });
    if (!invitation || invitation.workspaceId !== workspaceId) {
      return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
    }

    await revokeInvitation(workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
