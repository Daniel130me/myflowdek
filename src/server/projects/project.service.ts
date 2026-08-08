import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { DEFAULT_PROJECT_COLOR } from './constants';
import type { CreateProjectInput, UpdateProjectInput } from './schemas';

/**
 * Project service — all project business logic lives here.
 *
 * The creator of a project is always the authenticated user (ownerId comes
 * from the session, never from the browser). A ProjectMember row with OWNER
 * role is created in the same transaction.
 */

/** Shape returned by list/detail queries — safe public fields + counts. */
const projectSelect = {
  id: true,
  name: true,
  description: true,
  color: true,
  startDate: true,
  endDate: true,
  isArchived: true,
  ownerId: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { members: true, tasks: true } },
} as const;

/**
 * Create a project within a workspace.
 *
 * Transaction:
 *   1. Create the Project (ownerId = session user, workspaceId from URL).
 *   2. Create a ProjectMember row with OWNER role for the creator.
 *
 * The caller must have already been verified as a workspace member with
 * permission to create projects (requireWorkspaceRole in the route).
 */
export async function createProject(
  workspaceId: string,
  ownerId: string,
  input: CreateProjectInput,
) {
  return db.$transaction(async (tx) => {
    const project = await tx.project.create({
      data: {
        name: input.name,
        description: input.description ?? null,
        color: input.color ?? DEFAULT_PROJECT_COLOR,
        startDate: input.startDate ? new Date(input.startDate) : null,
        endDate: input.endDate ? new Date(input.endDate) : null,
        ownerId,
        workspaceId,
      },
      select: projectSelect,
    });

    await tx.projectMember.create({
      data: {
        projectId: project.id,
        userId: ownerId,
        role: 'OWNER',
        isFavorite: false,
      },
    });

    return project;
  });
}

/**
 * List projects in a workspace that the user is a member of.
 *
 * Single query with a relation filter on ProjectMember — returns only
 * projects the user can access, with their per-user isFavorite flag.
 */
export async function listProjectsForUser(
  workspaceId: string,
  userId: string,
  includeArchived: boolean,
) {
  const memberships = await db.projectMember.findMany({
    where: {
      userId,
      project: {
        workspaceId,
        ...(includeArchived ? {} : { isArchived: false }),
      },
    },
    select: {
      role: true,
      isFavorite: true,
      project: { select: projectSelect },
    },
    orderBy: { project: { updatedAt: 'desc' } },
  });

  return memberships.map((m) => ({
    ...m.project,
    role: m.role,
    isFavorite: m.isFavorite,
  }));
}

/** Get a single project's details. Assumes membership was already verified. */
export async function getProject(projectId: string) {
  const project = await db.project.findUnique({
    where: { id: projectId },
    select: projectSelect,
  });
  if (!project) {
    throw new AuthError('Project not found', 404);
  }
  return project;
}

/** Update a project's editable fields. */
export async function updateProject(projectId: string, input: UpdateProjectInput) {
  try {
    return await db.project.update({
      where: { id: projectId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.color !== undefined ? { color: input.color } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.endDate !== undefined
          ? { endDate: input.endDate ? new Date(input.endDate) : null }
          : {}),
      },
      select: projectSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Project not found', 404);
    }
    throw err;
  }
}

/** Archive a project (soft-delete — data is preserved). */
export async function archiveProject(projectId: string) {
  try {
    return await db.project.update({
      where: { id: projectId },
      data: { isArchived: true },
      select: projectSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Project not found', 404);
    }
    throw err;
  }
}

/** Restore an archived project. */
export async function restoreProject(projectId: string) {
  try {
    return await db.project.update({
      where: { id: projectId },
      data: { isArchived: false },
      select: projectSelect,
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Project not found', 404);
    }
    throw err;
  }
}

/**
 * Delete a project permanently. Cascading deletes remove tasks, tags,
 * comments, files, etc. (per schema onDelete: Cascade on Project).
 *
 * This is a hard delete — prefer archiveProject for soft removal.
 */
export async function deleteProject(projectId: string) {
  try {
    await db.project.delete({ where: { id: projectId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Project not found', 404);
    }
    throw err;
  }
}

/** Toggle the per-user favourite flag on a project membership. */
export async function toggleProjectFavorite(projectId: string, userId: string) {
  try {
    const membership = await db.projectMember.findUniqueOrThrow({
      where: { projectId_userId: { projectId, userId } },
      select: { isFavorite: true },
    });
    return db.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { isFavorite: !membership.isFavorite },
      select: { isFavorite: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Project membership not found', 404);
    }
    throw err;
  }
}
