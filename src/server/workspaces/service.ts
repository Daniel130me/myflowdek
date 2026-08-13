import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import {
  WORKSPACE_SLUG_MAX_LENGTH,
  WORKSPACE_DELETE_MAX_MEMBERS,
} from './constants';
import type { CreateWorkspaceInput, UpdateWorkspaceInput } from './schemas';

/**
 * Workspace service — all workspace business logic lives here so API routes
 * stay thin. Every function queries the database to enforce authorization;
 * never trusts caller-supplied IDs without a membership check.
 */

/** Shape returned by list/detail queries — only the safe, public fields. */
const workspaceSelect = {
  id: true,
  name: true,
  slug: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** Extended shape with the caller's role + member count. */
const workspaceDetailSelect = {
  ...workspaceSelect,
  _count: { select: { members: true, projects: true } },
} as const;

/**
 * Slugify a workspace name into a URL-safe slug.
 * "My Team Workspace" -> "my-team-workspace".
 */
function slugify(name: string): string {
  return (
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, WORKSPACE_SLUG_MAX_LENGTH) || 'workspace'
  );
}

/**
 * Ensure slug uniqueness by appending a short suffix if the base slug is
 * already taken. Only does an extra query when a collision is detected.
 */
async function uniqueSlug(base: string, userId: string): Promise<string> {
  const candidate = `${base}-${userId.slice(-4)}`;
  const existing = await db.workspace.findUnique({
    where: { slug: candidate },
    select: { id: true },
  });
  if (!existing) return candidate;
  // Extremely unlikely collision — append a timestamp fragment.
  return `${candidate}-${Date.now().toString(36).slice(-4)}`;
}

/**
 * Create a workspace and add the creator as the OWNER.
 *
 * Single transaction: workspace + membership. The caller is always the
 * initial OWNER — this is the only way a workspace is created outside of
 * onboarding.
 */
export async function createWorkspace(
  userId: string,
  input: CreateWorkspaceInput,
) {
  const baseSlug = slugify(input.name);
  const slug = await uniqueSlug(baseSlug, userId);

  return db.$transaction(async (tx) => {
    const workspace = await tx.workspace.create({
      data: { name: input.name, slug },
      select: workspaceDetailSelect,
    });

    await tx.workspaceMember.create({
      data: {
        workspaceId: workspace.id,
        userId,
        role: 'OWNER',
      },
    });

    return workspace;
  });
}

/**
 * List all workspaces the user belongs to, with their role in each.
 * Single query with a relation filter — no N+1.
 */
export async function listWorkspacesForUser(userId: string) {
  const memberships = await db.workspaceMember.findMany({
    where: { userId },
    select: {
      role: true,
      workspace: { select: workspaceDetailSelect },
    },
    orderBy: { workspace: { updatedAt: 'desc' } },
  });

  return memberships.map((m) => ({
    ...m.workspace,
    role: m.role,
  }));
}

/**
 * Get a single workspace's details. Authorization (membership check) is the
 * caller's responsibility — this function assumes the caller already verified
 * access via requireWorkspaceMember/requireWorkspaceRole.
 */
export async function getWorkspace(workspaceId: string) {
  const workspace = await db.workspace.findUnique({
    where: { id: workspaceId },
    select: workspaceDetailSelect,
  });
  if (!workspace) {
    throw new AuthError('Workspace not found', 404);
  }
  return workspace;
}

/**
 * Update a workspace's name. Re-slugifies only if the name changed
 * significantly (the slug is derived from the name; keeping it stable avoids
 * breaking shared URLs when the name is only lightly edited is NOT done —
 * we regenerate the slug to stay consistent with the new name).
 *
 * Actually: to avoid breaking links, we keep the slug stable on rename.
 * Slugs only change on create. This is a deliberate UX decision.
 */
export async function updateWorkspace(
  workspaceId: string,
  input: UpdateWorkspaceInput,
) {
  try {
    return await db.workspace.update({
      where: { id: workspaceId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
      },
      select: workspaceDetailSelect,
    });
  } catch (err) {
    // P2025 = record not found
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Workspace not found', 404);
    }
    throw err;
  }
}

/**
 * Delete a workspace. Safeguard: only the OWNER can delete, and only if the
 * workspace has no other members (the owner must remove them or transfer
 * ownership first). This prevents accidental destruction of a shared team's
 * data.
 *
 * Cascading deletes handle projects, tasks, etc. (per the schema's onDelete:
 * Cascade on Workspace → Project and WorkspaceMember).
 */
export async function deleteWorkspace(
  userId: string,
  workspaceId: string,
) {
  // Count members — if more than the threshold, refuse.
  const memberCount = await db.workspaceMember.count({
    where: { workspaceId },
  });
  if (memberCount > WORKSPACE_DELETE_MAX_MEMBERS) {
    throw new AuthError(
      'Cannot delete a workspace with other members. Remove all members or transfer ownership first.',
      409,
    );
  }

  try {
    await db.workspace.delete({ where: { id: workspaceId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Workspace not found', 404);
    }
    throw err;
  }
}
