import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import { revokeInvitation } from '@/server/invitations/service';
import { INVITATION_ISSUER_ROLES } from '@/server/invitations/constants';
import type { WorkspaceRole } from '@prisma/client';

/**
 * DELETE /api/workspaces/:workspaceId/invitations/:id
 *
 * Revoke a pending invitation. OWNER/ADMIN only. Marks the invitation as
 * REVOKED (keeps the row for audit) rather than hard-deleting.
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; id: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, id } = await params;

    await requireWorkspaceRole(
      user.id,
      workspaceId,
      INVITATION_ISSUER_ROLES as unknown as WorkspaceRole[],
    );

    await revokeInvitation(workspaceId, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
