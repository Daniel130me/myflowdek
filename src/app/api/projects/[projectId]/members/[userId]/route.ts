import { NextResponse } from 'next/server';
import {
  requireAuthenticatedUser,
  requireProjectMember,
  requireProjectRole,
  authErrorResponse,
} from '@/server/auth/authorization';
import {
  updateProjectMemberRole,
  removeProjectMember,
  updateProjectMemberRoleSchema,
} from '@/server/projects/project-members.service';
import { PROJECT_MANAGER_ROLES } from '@/server/projects/constants';
import type { ProjectRole } from '@prisma/client';

/**
 * PATCH /api/projects/:projectId/members/:userId
 *
 * Change a member's role. OWNER/ADMIN only. Cannot change to OWNER (use a
 * transfer endpoint) and cannot change your own role.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, userId: targetUserId } = await params;

    await requireProjectRole(user.id, projectId, PROJECT_MANAGER_ROLES as unknown as ProjectRole[]);

    const body = await request.json().catch(() => null);
    const parsed = updateProjectMemberRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
        { status: 400 },
      );
    }

    const member = await updateProjectMemberRole(projectId, targetUserId, parsed.data, user.id);
    return NextResponse.json({ member });
  } catch (error) {
    return authErrorResponse(error);
  }
}

/**
 * DELETE /api/projects/:projectId/members/:userId
 *
 * Remove a member from the project. OWNER/ADMIN can remove others; any
 * member can remove themselves (leave). The OWNER cannot be removed
 * (transfer ownership first).
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; userId: string }> },
) {
  try {
    const user = await requireAuthenticatedUser();
    const { projectId, userId: targetUserId } = await params;

    const isSelf = targetUserId === user.id;

    if (isSelf) {
      // Leaving — any member can remove themselves.
      await requireProjectMember(user.id, projectId);
    } else {
      // Removing someone else requires manager role.
      await requireProjectRole(user.id, projectId, PROJECT_MANAGER_ROLES as unknown as ProjectRole[]);
    }

    await removeProjectMember(projectId, targetUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return authErrorResponse(error);
  }
}
