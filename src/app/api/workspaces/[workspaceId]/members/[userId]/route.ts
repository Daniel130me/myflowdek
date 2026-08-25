import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireWorkspaceCapability,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  updateMemberRole,
  removeWorkspaceMember,
} from '@/server/workspaces/member-service';
import { updateMemberRoleSchema } from '@/server/workspaces/member-schemas';

/**
 * PATCH /api/workspaces/:workspaceId/members/:userId
 *
 * Change a member's role. Only OWNER and ADMIN can change roles. The target
 * cannot be changed to OWNER (use the transfer endpoint) and a user cannot
 * change their own role.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, userId: targetUserId } = await params;

    // Only managers (OWNER, ADMIN) can change roles.
    await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_MEMBERS');

    const body = await request.json().catch(() => null);
    const parsed = updateMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const member = await updateMemberRole(workspaceId, targetUserId, parsed.data, user.id);
    return NextResponse.json({ member });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/workspaces/:workspaceId/members/:userId
 *
 * Remove a member from the workspace. OWNER and ADMIN can remove others;
 * any member can remove themselves (leave). The OWNER cannot be removed
 * (transfer ownership first).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ workspaceId: string; userId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { workspaceId, userId: targetUserId } = await params;

    const isSelf = targetUserId === user.id;

    if (isSelf) {
      // Leaving — any member can remove themselves (verified below to
      // confirm they're actually a member).
      await requireWorkspaceCapability(user.id, workspaceId, 'VIEW_WORKSPACE');
    } else {
      // Removing someone else requires manager role.
      await requireWorkspaceCapability(user.id, workspaceId, 'MANAGE_MEMBERS');
    }

    await removeWorkspaceMember(workspaceId, targetUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
