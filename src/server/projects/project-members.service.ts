import { z } from 'zod';
import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { VALID_PROJECT_MEMBER_ROLES } from './constants';

/** Validation for adding a member to a project. */
export const addProjectMemberSchema = z.object({
  userId: z.string().trim().min(1, 'userId is required'),
  role: z.enum(VALID_PROJECT_MEMBER_ROLES).default('MEMBER'),
});

/** Validation for updating a project member's role. */
export const updateProjectMemberRoleSchema = z.object({
  role: z.enum(VALID_PROJECT_MEMBER_ROLES),
});

export type AddProjectMemberInput = z.infer<typeof addProjectMemberSchema>;
export type UpdateProjectMemberRoleInput = z.infer<typeof updateProjectMemberRoleSchema>;

/** Shape for member listing — safe public fields + role + favourite. */
const memberSelect = {
  userId: true,
  role: true,
  isFavorite: true,
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
 * List all members of a project. Single query with nested user select —
 * no N+1. Ordered by role (OWNER first) then joined date.
 */
export function listProjectMembers(projectId: string) {
  return db.projectMember.findMany({
    where: { projectId },
    select: memberSelect,
    orderBy: [{ role: 'asc' }, { joinedAt: 'asc' }],
  });
}

/**
 * Add a member to a project. The target user must already be a workspace
 * member (enforced by the route via requireWorkspaceMember on the target).
 *
 * Guards:
 *   - Cannot add a user who is already a project member.
 *   - Cannot add with OWNER role (use the transfer-ownership pattern).
 */
export async function addProjectMember(
  projectId: string,
  input: AddProjectMemberInput,
) {
  const existing = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: input.userId } },
    select: { userId: true },
  });
  if (existing) {
    throw new AuthError('This user is already a member of the project', 409);
  }

  try {
    return await db.projectMember.create({
      data: {
        projectId,
        userId: input.userId,
        role: input.role,
      },
      select: memberSelect,
    });
  } catch (err) {
    // P2003 = foreign key violation (user doesn't exist or isn't a workspace member)
    if (err instanceof Prisma.PrismaClientKnownRequestError &&
        (err.code === 'P2003' || err.code === 'P2002')) {
      throw new AuthError(
        'Cannot add this user. Ensure they are a workspace member.',
        400,
      );
    }
    throw err;
  }
}

/**
 * Change a project member's role. Guards:
 *   - Cannot change to OWNER (use a transfer endpoint).
 *   - Cannot change your own role (prevents self-lockout).
 *   - Target must be a current member.
 */
export async function updateProjectMemberRole(
  projectId: string,
  targetUserId: string,
  input: UpdateProjectMemberRoleInput,
  actingUserId: string,
) {
  if (targetUserId === actingUserId) {
    throw new AuthError('You cannot change your own role', 400);
  }

  try {
    return await db.projectMember.update({
      where: { projectId_userId: { projectId, userId: targetUserId } },
      data: { role: input.role },
      select: memberSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Member not found in this project', 404);
    }
    throw err;
  }
}

/**
 * Remove a member from a project. Guards:
 *   - Cannot remove the OWNER (transfer ownership first).
 *   - A member removing themselves = "leave project".
 */
export async function removeProjectMember(
  projectId: string,
  targetUserId: string,
) {
  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId: targetUserId } },
    select: { role: true },
  });
  if (!membership) {
    throw new AuthError('Member not found in this project', 404);
  }
  if (membership.role === 'OWNER') {
    throw new AuthError(
      'Cannot remove the project owner. Transfer ownership first.',
      409,
    );
  }

  await db.projectMember.delete({
    where: { projectId_userId: { projectId, userId: targetUserId } },
  });
}
