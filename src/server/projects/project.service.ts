import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { PROJECT_TEMPLATES } from '@/features/flowdeck/model/templates';
import { randomUUID } from 'node:crypto';
import { DEFAULT_PROJECT_COLOR } from './constants';
import type {
  CreateProjectFromTemplateInput,
  CreateProjectInput,
  UpdateProjectInput,
} from './schemas';

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
  const project = await db.$transaction(async (tx) => {
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

  return { ...project, role: 'OWNER' as const, isFavorite: false };
}

/**
 * Create a project and all template-owned records atomically.
 *
 * Template task IDs only describe dependency edges. The database receives
 * fresh server-generated IDs, and dependency rows are remapped after every
 * new task ID is known. Legacy demo assignees are deliberately omitted
 * because IDs such as `u1`/`u5` are not real project memberships.
 */
export async function createProjectFromTemplate(
  workspaceId: string,
  ownerId: string,
  input: CreateProjectFromTemplateInput,
) {
  const template = PROJECT_TEMPLATES.find((candidate) => candidate.id === input.templateId);
  if (!template) throw new AuthError('Project template not found', 404);

  const project = await db.$transaction(async (tx) => {
    const createdProject = await tx.project.create({
      data: {
        name: input.name,
        description: input.description ?? template.description,
        color: input.color ?? template.color ?? DEFAULT_PROJECT_COLOR,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        ownerId,
        workspaceId,
      },
      select: projectSelect,
    });

    await tx.projectMember.create({
      data: { projectId: createdProject.id, userId: ownerId, role: 'OWNER' },
    });

    if (template.tags.length > 0) {
      await tx.tag.createMany({
        data: template.tags.map((tag) => ({
          projectId: createdProject.id,
          name: tag.name,
          color: tag.color,
        })),
      });
    }

    if (template.customCols.length > 0) {
      await tx.customField.createMany({
        data: template.customCols.map((field) => ({
          projectId: createdProject.id,
          key: field.key,
          label: field.label,
          type: field.type,
          options: field.options ?? undefined,
        })),
      });
    }

    const templateTasks = template.generateTasks(createdProject.id, input.startDate);
    const taskIds = new Map(templateTasks.map((task) => [task.id, randomUUID()]));

    if (templateTasks.length > 0) {
      await tx.task.createMany({
        data: templateTasks.map((task, index) => ({
          id: taskIds.get(task.id)!,
          projectId: createdProject.id,
          name: task.name,
          description: task.description ?? null,
          status: task.status,
          priority: task.priority,
          startDate: task.start ? new Date(task.start) : null,
          dueDate: task.dueDate ? new Date(task.dueDate) : null,
          duration: task.duration,
          progress: task.progress,
          sortOrder: index,
          isMilestone: task.milestone ?? false,
          createdById: ownerId,
          assigneeId: null,
        })),
      });

      const dependencies = templateTasks.flatMap((task) =>
        task.deps.map((dependencyId) => ({
          taskId: taskIds.get(task.id)!,
          dependsOnId: taskIds.get(dependencyId)!,
        })),
      );
      if (dependencies.length > 0) {
        await tx.taskDependency.createMany({ data: dependencies });
      }
    }

    return createdProject;
  });

  return { ...project, role: 'OWNER' as const, isFavorite: false };
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
      project: {
        select: {
          ...projectSelect,
          members: { select: { userId: true } },
        },
      },
    },
    orderBy: { project: { updatedAt: 'desc' } },
  });

  const projectIds = memberships.map(({ project }) => project.id);
  if (projectIds.length === 0) return [];

  // These grouped queries have constant query count and return aggregate rows
  // only; task bodies never cross the database boundary for portfolio cards.
  const [taskTotals, completedTotals, overdueTotals] = await Promise.all([
    db.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds } },
      _count: { _all: true },
      _avg: { progress: true },
    }),
    db.task.groupBy({
      by: ['projectId'],
      where: { projectId: { in: projectIds }, status: 'done' },
      _count: { _all: true },
    }),
    db.task.groupBy({
      by: ['projectId'],
      where: {
        projectId: { in: projectIds },
        status: { not: 'done' },
        dueDate: { lt: new Date() },
      },
      _count: { _all: true },
    }),
  ]);

  const taskStats = new Map(taskTotals.map((row) => [row.projectId, row]));
  const completedByProject = new Map(
    completedTotals.map((row) => [row.projectId, row._count._all]),
  );
  const overdueByProject = new Map(
    overdueTotals.map((row) => [row.projectId, row._count._all]),
  );

  return memberships.map(({ project, role, isFavorite }) => {
    const { members, ...publicProject } = project;
    const totals = taskStats.get(project.id);
    return {
      ...publicProject,
      members: members.map(({ userId: memberId }) => memberId),
      role,
      isFavorite,
      portfolio: {
        taskCount: totals?._count._all ?? 0,
        completedTaskCount: completedByProject.get(project.id) ?? 0,
        averageProgress: Math.round(totals?._avg.progress ?? 0),
        overdueTaskCount: overdueByProject.get(project.id) ?? 0,
        memberCount: members.length,
      },
    };
  });
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

/** Set the per-user favourite flag idempotently in a single query. */
export async function setProjectFavorite(
  projectId: string,
  userId: string,
  isFavorite: boolean,
) {
  try {
    return await db.projectMember.update({
      where: { projectId_userId: { projectId, userId } },
      data: { isFavorite },
      select: { isFavorite: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Project membership not found', 404);
    }
    throw err;
  }
}
