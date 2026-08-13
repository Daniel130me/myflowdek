import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
import { recordActivity } from '@/server/activity/activity.service';
import { ACTIVITY_TYPES } from '@/server/activity/constants';
import { createNotification } from '@/server/notifications/notification.service';
import { NOTIFICATION_TYPES } from '@/server/notifications/constants';
import { executeAutomations } from '@/server/automations/execution-engine';
import type { CreateTaskInput, UpdateTaskInput } from './schemas';

/**
 * Fire-and-forget automation execution helper.
 *
 * Automations run AFTER the mutation has been committed. They must NEVER roll
 * back the mutation, so we swallow any rejection into a console log. The
 * `void` keyword marks the returned Promise as intentionally un-awaited.
 */
function fireAutomations(
  projectId: string,
  trigger: string,
  task: {
    id: string;
    name: string;
    status: string;
    priority: string;
    assigneeId: string | null;
    dueDate: Date | null;
  },
): void {
  void executeAutomations(projectId, trigger, task).catch((err) => {
    console.error(`[automations] ${trigger} trigger failed for task ${task.id}:`, err);
  });
}

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
  recurrence: true,
  assigneeId: true,
  createdById: true,
  parentId: true,
  sectionId: true,
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

/** Create a task. The createdById always comes from the session.
 *  Validates relational integrity: assignee must be a project member,
 *  parent must belong to the same project, section must belong to the
 *  same project. */
export async function createTask(
  projectId: string,
  createdById: string,
  input: CreateTaskInput,
) {
  // --- Relational integrity validation ---
  // Assignee must be a project member.
  if (input.assigneeId) {
    const isMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: input.assigneeId } },
      select: { userId: true },
    });
    if (!isMember) {
      throw new AuthError('Assignee is not a member of this project', 400);
    }
  }

  // Parent must belong to the same project.
  if (input.parentId) {
    const parent = await db.task.findUnique({
      where: { id: input.parentId },
      select: { projectId: true },
    });
    if (!parent || parent.projectId !== projectId) {
      throw new AuthError('Parent task not found in this project', 400);
    }
  }

  // Section must belong to the same project.
  if (input.sectionId) {
    const section = await db.section.findUnique({
      where: { id: input.sectionId },
      select: { projectId: true },
    });
    if (!section || section.projectId !== projectId) {
      throw new AuthError('Section not found in this project', 400);
    }
  }

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
      assigneeId: input.assigneeId ?? null,
      sectionId: input.sectionId ?? null,
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

  // Fire task_created automations (non-blocking, never rolls back the create).
  fireAutomations(projectId, 'task_created', {
    id: task.id,
    name: task.name,
    status: task.status,
    priority: task.priority,
    assigneeId: task.assigneeId,
    dueDate: task.dueDate,
  });

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

  const projectId = before.projectId;

  // --- Relational integrity validation on update ---
  // Assignee must be a project member.
  if (input.assigneeId && input.assigneeId !== null) {
    const isMember = await db.projectMember.findUnique({
      where: { projectId_userId: { projectId, userId: input.assigneeId } },
      select: { userId: true },
    });
    if (!isMember) {
      throw new AuthError('Assignee is not a member of this project', 400);
    }
  }

  // Parent must belong to the same project + no self-parenting + no circular hierarchy.
  if (input.parentId !== undefined && input.parentId !== null) {
    if (input.parentId === taskId) {
      throw new AuthError('A task cannot be its own parent', 400);
    }
    const parent = await db.task.findUnique({
      where: { id: input.parentId },
      select: { projectId: true },
    });
    if (!parent || parent.projectId !== projectId) {
      throw new AuthError('Parent task not found in this project', 400);
    }
    // Walk up the parent chain to detect circular hierarchy.
    let current = input.parentId;
    const visited = new Set<string>([taskId]);
    for (let i = 0; i < 50; i++) { // depth guard
      if (visited.has(current)) {
        throw new AuthError('Circular task hierarchy detected', 400);
      }
      visited.add(current);
      const ancestor = await db.task.findUnique({
        where: { id: current },
        select: { parentId: true },
      });
      if (!ancestor?.parentId) break;
      current = ancestor.parentId;
    }
  }

  // Section must belong to the same project.
  if (input.sectionId && input.sectionId !== null) {
    const section = await db.section.findUnique({
      where: { id: input.sectionId },
      select: { projectId: true },
    });
    if (!section || section.projectId !== projectId) {
      throw new AuthError('Section not found in this project', 400);
    }
  }

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
        ...(input.sectionId !== undefined ? { sectionId: input.sectionId } : {}),
        ...(input.recurrence !== undefined ? { recurrence: input.recurrence } : {}),
      },
      select: taskSelect,
    });

    // Record activity for significant changes (non-blocking, best-effort).
    const pid = before.projectId;

    if (input.status !== undefined && input.status !== before.status) {
      if (input.status === 'done') {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.COMPLETED, 'completed this task');
      } else if (before.status === 'done') {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.REOPENED, 'reopened this task');
      } else {
        await recordActivity(taskId, pid, actingUserId ?? null, ACTIVITY_TYPES.STATUS_CHANGE,
          `Status changed from ${before.status} → ${input.status}`,
          { before: before.status, after: input.status });
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

        // Notify the new assignee (don't notify if self-assigning).
        if (input.assigneeId !== actingUserId) {
          const assigneeName = await db.user.findUnique({
            where: { id: actingUserId ?? '' },
            select: { name: true },
          }).then(u => u?.name ?? 'Someone').catch(() => 'Someone');
          const taskName = input.name ?? before.name;
          await createNotification(
            input.assigneeId,
            NOTIFICATION_TYPES.TASK_ASSIGNED,
            `${assigneeName} assigned you to "${taskName}"`,
            { actorId: actingUserId ?? null, projectId: pid, taskId },
          );
        }
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

    // Fire automation triggers for the changes that have dedicated rules.
    // Each trigger only fires when the corresponding field actually changed,
    // and only AFTER the mutation + activity log have committed. Automations
    // are non-blocking and never roll back the mutation.
    if (input.status !== undefined && input.status !== before.status) {
      // The engine's status_change rules compare trigger.value against the
      // task's NEW status, so we pass the post-update state.
      fireAutomations(pid, 'status_change', {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assigneeId,
        dueDate: updated.dueDate,
      });
      // task_completed is a dedicated trigger fired only when transitioning
      // INTO the 'done' status (not when re-opening).
      if (input.status === 'done') {
        fireAutomations(pid, 'task_completed', {
          id: updated.id,
          name: updated.name,
          status: updated.status,
          priority: updated.priority,
          assigneeId: updated.assigneeId,
          dueDate: updated.dueDate,
        });
      }
    }

    if (input.priority !== undefined && input.priority !== before.priority) {
      fireAutomations(pid, 'priority_change', {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assigneeId,
        dueDate: updated.dueDate,
      });
    }

    if (input.assigneeId !== undefined && input.assigneeId !== before.assigneeId) {
      fireAutomations(pid, 'assignee_change', {
        id: updated.id,
        name: updated.name,
        status: updated.status,
        priority: updated.priority,
        assigneeId: updated.assigneeId,
        dueDate: updated.dueDate,
      });
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
