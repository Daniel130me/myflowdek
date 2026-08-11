import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { recordActivity } from '@/server/activity/activity.service';
import { ACTIVITY_TYPES } from '@/server/activity/constants';
import { executeAutomations } from '@/server/automations/execution-engine';
import type { CreateTaskInput, UpdateTaskInput } from './schemas';

/** Shape returned by task queries — safe public fields. */
const taskSelect = {
  id: true,
  projectId: true,
  name: true,
  description: true,
  status: true,
  priority: true,
  startDate: true,
  dueDate: true,
  duration: true,
  progress: true,
  sortOrder: true,
  isMilestone: true,
  assigneeId: true,
  createdById: true,
  parentId: true,
  completedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

/** List all tasks in a project. Single query — no N+1. */
export function listTasks(projectId: string) {
  return db.task.findMany({
    where: { projectId },
    select: taskSelect,
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/** Create a task. The createdById always comes from the session. */
export async function createTask(
  projectId: string,
  createdById: string,
  input: CreateTaskInput,
) {
  const maxSort = await db.task.findFirst({
    where: { projectId },
    orderBy: { sortOrder: 'desc' },
    select: { sortOrder: true },
  });

  const task = await db.task.create({
    data: {
      projectId,
      name: input.name,
      description: input.description ?? null,
      status: input.status ?? 'backlog',
      priority: input.priority ?? 'medium',
      startDate: input.startDate ? new Date(input.startDate) : null,
      dueDate: input.dueDate ? new Date(input.dueDate) : null,
      duration: input.duration ?? 1,
      parentId: input.parentId ?? null,
      createdById,
      sortOrder: (maxSort?.sortOrder ?? -1) + 1,
    },
    select: taskSelect,
  });

  // Record activity: "X created this task"
  await recordActivity(
    task.id,
    projectId,
    createdById,
    ACTIVITY_TYPES.CREATED,
    'created this task',
  );

  return task;
}

/** Get a single task. */
export async function getTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId }, select: taskSelect });
  if (!task) throw new AuthError('Task not found', 404);
  return task;
}

/**
 * Update a task's editable fields. Records activity entries for significant
 * changes (status, priority, assignee, due date, name).
 *
 * The `actingUserId` is used as the activity author; pass the session user.
 */
export async function updateTask(
  taskId: string,
  input: UpdateTaskInput,
  actingUserId?: string,
) {
  // Fetch the current state to diff against (for activity descriptions).
  const before = await db.task.findUnique({
    where: { id: taskId },
    select: { status: true, priority: true, assigneeId: true, dueDate: true, name: true, projectId: true },
  });
  if (!before) throw new AuthError('Task not found', 404);

  try {
    const updated = await db.task.update({
      where: { id: taskId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.description !== undefined ? { description: input.description } : {}),
        ...(input.status !== undefined ? {
          status: input.status,
          completedAt: input.status === 'done' ? new Date() : null,
        } : {}),
        ...(input.priority !== undefined ? { priority: input.priority } : {}),
        ...(input.startDate !== undefined
          ? { startDate: input.startDate ? new Date(input.startDate) : null }
          : {}),
        ...(input.dueDate !== undefined
          ? { dueDate: input.dueDate ? new Date(input.dueDate) : null }
          : {}),
        ...(input.duration !== undefined ? { duration: input.duration } : {}),
        ...(input.progress !== undefined ? { progress: input.progress } : {}),
        ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId } : {}),
        ...(input.parentId !== undefined ? { parentId: input.parentId } : {}),
      },
      select: taskSelect,
    });

    // Record activity for significant changes (non-blocking, best-effort).
    const pid = before.projectId;

    if (input.status !== undefined && input.status !== before.status) {
      if (input.status === 'done') {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.COMPLETED, 'completed this task');
        // Trigger automation: task_completed.
        await executeAutomations(pid, 'task_completed', { id: taskId, name: before.name, status: input.status, priority: before.priority, assigneeId: before.assigneeId, dueDate: null }).catch(() => {});
      } else if (before.status === 'done') {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.REOPENED, 'reopened this task');
      } else {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.STATUS_CHANGE,
          `Status changed from ${before.status} → ${input.status}`,
          { before: before.status, after: input.status });
        // Trigger automation: status_change.
        await executeAutomations(pid, 'status_change', { id: taskId, name: before.name, status: input.status, priority: before.priority, assigneeId: before.assigneeId, dueDate: null }).catch(() => {});
      }
    }

    if (input.priority !== undefined && input.priority !== before.priority) {
      await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.PRIORITY_CHANGE,
        `Priority changed from ${before.priority} → ${input.priority}`,
        { before: before.priority, after: input.priority });
    }

    if (input.assigneeId !== undefined && input.assigneeId !== before.assigneeId) {
      if (input.assigneeId) {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.ASSIGNED,
          'was assigned', { after: input.assigneeId });
      } else {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.UNASSIGNED, 'was unassigned');
      }
    }

    if (input.dueDate !== undefined) {
      const beforeStr = before.dueDate ? before.dueDate.toISOString() : null;
      const afterStr = input.dueDate ?? null;
      if (beforeStr !== afterStr) {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.DUE_DATE_CHANGE,
          input.dueDate ? `Due date changed to ${input.dueDate}` : 'Due date removed',
          { before: beforeStr, after: afterStr });
      }
    }

    if (input.name !== undefined && input.name !== before.name) {
      await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.NAME_CHANGE,
        `Renamed from "${before.name}" to "${input.name}"`,
        { before: before.name, after: input.name });
    }

    return updated;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Task not found', 404);
    }
    throw err;
  }
}

/** Delete a task permanently. */
export async function deleteTask(taskId: string) {
  try {
    await db.task.delete({ where: { id: taskId } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2025') {
      throw new AuthError('Task not found', 404);
    }
    throw err;
  }
}
