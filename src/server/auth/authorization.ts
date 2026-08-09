import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db/client';
import type { WorkspaceRole, ProjectRole } from '@prisma/client';

/**
 * Server-side authorization helpers for FlowDeck.
 *
 * Every helper queries the database to verify membership/role — never trusts
 * a userId/workspaceId/role sent by the frontend. The authenticated session
 * (JWT) establishes identity; PostgreSQL membership establishes permission.
 *
 * Usage (inside an API route or server action):
 *   const user = await requireAuthenticatedUser();
 *   await requireWorkspaceRole(user.id, workspaceId, ['OWNER', 'ADMIN']);
 */

/** Typed authorization error carrying an HTTP status code. */
export class AuthError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

/** Return the authenticated user from the session, or throw 401. */
export async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError('Authentication required', 401);
  }
  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? undefined,
    jobTitle: session.user.jobTitle ?? undefined,
    avatarColor: session.user.avatarColor ?? undefined,
  };
}

/**
 * Require the authenticated user to have SUPER_ADMIN platform role.
 *
 * This is completely distinct from workspace/project roles. A SUPER_ADMIN
 * can access the internal admin dashboard (users, workspaces, audit, system
 * health). The check queries the DB — never trusts the session for the
 * platform role (the session JWT doesn't carry it).
 *
 * Throws 401 if not authenticated, 403 if not a super admin.
 */
export async function requireSuperAdmin() {
  const user = await requireAuthenticatedUser();

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { platformRole: true },
  });

  if (!dbUser || dbUser.platformRole !== 'SUPER_ADMIN') {
    throw new AuthError('Super admin access required', 403);
  }

  return user;
}

/**
 * Verify the user is a member of the workspace. Returns the membership row
 * (which includes the role). Throws 403 if not a member.
 *
 * Single keyed query on the (workspaceId, userId) composite primary key.
 */
export async function requireWorkspaceMember(userId: string, workspaceId: string) {
  const membership = await db.workspaceMember.findUnique({
    where: { workspaceId_userId: { workspaceId, userId } },
  });
  if (!membership) {
    throw new AuthError('You do not have access to this workspace', 403);
  }
  return membership;
}

/**
 * Verify the user holds one of the allowed workspace roles. Throws 403 if the
 * user is a member but lacks the required role, or 403 if not a member at all.
 */
export async function requireWorkspaceRole(
  userId: string,
  workspaceId: string,
  allowedRoles: WorkspaceRole[],
) {
  const membership = await requireWorkspaceMember(userId, workspaceId);
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError('Insufficient workspace permissions', 403);
  }
  return membership;
}

/**
 * Verify the user is a member of the project. Returns the ProjectMember row.
 * Throws 404 if the project doesn't exist, 403 if the user isn't a member.
 *
 * Two queries: project lookup (to return 404 cleanly) + membership lookup.
 * Could be one join, but keeping them separate makes the error semantics
 * clearer (not-found vs. forbidden).
 */
export async function requireProjectMember(userId: string, projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: { id: true, workspaceId: true },
  });
  if (!project) {
    throw new AuthError('Project not found', 404);
  }

  const membership = await db.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  });
  if (!membership) {
    throw new AuthError('You do not have access to this project', 403);
  }
  return { project, membership };
}

/**
 * Verify the user holds one of the allowed project roles. Throws 404 if the
 * project doesn't exist, 403 if not a member or insufficient role.
 */
export async function requireProjectRole(
  userId: string,
  projectId: string,
  allowedRoles: ProjectRole[],
) {
  const { project, membership } = await requireProjectMember(userId, projectId);
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError('Insufficient project permissions', 403);
  }
  return { project, membership };
}

/**
 * Convenience: convert an AuthError into a NextResponse with the right status
 * and a generic message (never leaks internal details).
 */
export function authErrorResponse(error: unknown): Response {
  if (error instanceof AuthError) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: error.statusCode,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // Unexpected errors get a generic 500 — never expose internals.
  console.error('[auth] unexpected error:', error);
  return new Response(JSON.stringify({ error: 'An unexpected error occurred' }), {
    status: 500,
    headers: { 'Content-Type': 'application/json' },
  });
}
