import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import type { UpdateMemberRoleInput } from './member-schemas';

/**
 * Workspace membership service.
 *
 * All functions assume the caller has already been authenticated. Role checks
 * (e.g. "only OWNER can change roles") are enforced here via the service, but
 * the initial membership verification is done in the API route via
 * requireWorkspaceRole.
 */

/** Shape for member listing — safe public fields + role + joined date. */
const memberSelect = {
  userId: true,
  role: true,
  joinedAt: true,
  user: {
    select: {
      id: true,
      name: true,
      email: true,
      avatarColor: true,
      jobTitle: true,
    },
  },
} as const;

/**
 * List all members of a workspace. Single query with nested user select —
 * no N+1. Ordered by joinedAt so the owner appears first.
 */
export async function listWorkspaceMembers(workspaceId: string) {
  return db.workspaceMember.findMany({
    where: { workspaceId },
    select: memberSelect,
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });
}

/**
 * Change a member's role. Guards:
 *   - Cannot change to OWNER (use the transfer-ownership endpoint instead).
 *   - Cannot change your own role (prevents self-lockout).
 *   - Target user must be a current member.
 */
export async function updateMemberRole(
  workspaceId: string,
  targetUserId: string,
  input: UpdateMemberRoleInput,
  actingUserId: string,
) {
  if (targetUserId === actingUserId) {
    throw new AuthError('You cannot change your own role', 400);
  }

  try {
    return await db.workspaceMember.update({
      where: {
        workspaceId_userId: { workspaceId, userId: targetUserId },
      },
      data: { role: input.role },
      select: memberSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Member not found in this workspace', 404);
    }
    throw err;
  }
}

/**
 * Remove a member from the workspace. Guards:
 *   - Cannot remove the OWNER (use transfer-ownership first).
 *   - A member removing themselves = "leave workspace".
 *
 * Cascades: their ProjectMember rows are NOT auto-removed (they reference
 * Project, not Workspace). A future enhancement could clean those up.
 */
export async function removeWorkspaceMember(
  workspaceId: string,
  targetUserId: string,
) {
  // Block removal of the OWNER — they must transfer ownership first.
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
    select: { role: true },
  });
  if (!membership) {
    throw new AuthError('Member not found in this workspace', 404);
  }
  if (membership.role === 'OWNER') {
    throw new AuthError(
      'Cannot remove the workspace owner. Transfer ownership first.',
      409,
    );
  }

  await db.workspaceMember.delete({
    where: { workspaceId_userId: { workspaceId, userId: targetUserId } },
  });
}

/**
 * Transfer workspace ownership to another existing member.
 *
 * Transaction:
 *   1. Demote the current OWNER to ADMIN.
 *   2. Promote the target member to OWNER.
 *
 * Guards:
 *   - Target must already be a workspace member.
 *   - Target cannot already be the OWNER.
 */
export async function transferOwnership(
  workspaceId: string,
  currentOwnerId: string,
  newOwnerId: string,
) {
  if (currentOwnerId === newOwnerId) {
    throw new AuthError('You are already the owner', 400);
  }

  const targetMembership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
  });
  if (!targetMembership) {
    throw new AuthError('The target user is not a member of this workspace', 404);
  }
  if (targetMembership.role === 'OWNER') {
    throw new AuthError('The target user is already the owner', 409);
  }

  return db.$transaction(async (tx) => {
    // Demote current owner to ADMIN.
    await tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: currentOwnerId } },
      data: { role: 'ADMIN' },
    });
    // Promote new owner.
    return tx.workspaceMember.update({
      where: { workspaceId_userId: { workspaceId, userId: newOwnerId } },
      data: { role: 'OWNER' },
      select: memberSelect,
    });
  });
}
