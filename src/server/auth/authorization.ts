import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/server/db/client';
import type { WorkspaceRole, ProjectRole } from '@prisma/client';
import { PROJECT_PERMISSIONS, WORKSPACE_PERMISSIONS } from './capabilities';
import type { ProjectCapability, WorkspaceCapability } from './capabilities';

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

/** Return the authenticated user from the session, or throw 401.
 *  Also rejects DISABLED/DELETED users and stale sessions (sessionVersion
 *  mismatch) by querying the DB. This adds one DB query per authenticated
 *  request — necessary for security (a JWT may be valid but the account
 *  may have been disabled or the password reset). */
export async function requireAuthenticatedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    throw new AuthError('Authentication required', 401);
  }

  // Check user status + sessionVersion in the DB. This is the security-
  // critical check that blocks disabled/deleted users and stale sessions
  // after password reset.
  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      jobTitle: true,
      avatarColor: true,
      status: true,
      sessionVersion: true,
    },
  });

  if (!dbUser) {
    throw new AuthError('Account not found', 401);
  }

  if (dbUser.status !== 'ACTIVE') {
    throw new AuthError(
      dbUser.status === 'DISABLED' ? 'Account disabled' : 'Account deleted',
      403,
    );
  }

  // Session version check: if the JWT's version doesn't match the DB,
  // the session was revoked (password reset, logout-all, account disable).
  const jwtSessionVersion = (session.user as { sessionVersion?: number }).sessionVersion ?? 0;
  if (dbUser.sessionVersion !== jwtSessionVersion) {
    throw new AuthError('Session expired — please sign in again', 401);
  }

  return {
    id: dbUser.id,
    email: dbUser.email,
    name: dbUser.name ?? undefined,
    jobTitle: dbUser.jobTitle ?? undefined,
    avatarColor: dbUser.avatarColor ?? undefined,
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
 * Require the user to have a specific project capability.
 * Uses the centralized PROJECT_PERMISSIONS matrix — never hard-codes roles.
 *
 * Example: await requireProjectCapability(user.id, projectId, 'DELETE_TASK');
 */
export async function requireProjectCapability(
  userId: string,
  projectId: string,
  capability: ProjectCapability,
) {
  const { membership } = await requireProjectMember(userId, projectId);
  const allowedRoles = PROJECT_PERMISSIONS[capability];
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError(
      `Insufficient permissions: ${capability} requires ${allowedRoles.join(' or ')}`,
      403,
    );
  }
  return membership;
}

/**
 * Require the user to have a specific workspace capability.
 * Uses the centralized WORKSPACE_PERMISSIONS matrix.
 *
 * Example: await requireWorkspaceCapability(user.id, workspaceId, 'INVITE_MEMBERS');
 */
export async function requireWorkspaceCapability(
  userId: string,
  workspaceId: string,
  capability: WorkspaceCapability,
) {
  const membership = await requireWorkspaceMember(userId, workspaceId);
  const allowedRoles = WORKSPACE_PERMISSIONS[capability];
  if (!allowedRoles.includes(membership.role)) {
    throw new AuthError(
      `Insufficient permissions: ${capability} requires ${allowedRoles.join(' or ')}`,
      403,
    );
  }
  return membership;
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
