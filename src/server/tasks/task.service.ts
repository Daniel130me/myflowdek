import { db } from '@/server/db/client';
import { Prisma } from '@prisma/client';
import { AuthError } from '@/server/auth/authorization';
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

  return db.task.create({
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
}

/** Get a single task. */
export async function getTask(taskId: string) {
  const task = await db.task.findUnique({ where: { id: taskId }, select: taskSelect });
  if (!task) throw new AuthError('Task not found', 404);
  return task;
}

/** Update a task's editable fields. */
export async function updateTask(taskId: string, input: UpdateTaskInput) {
  try {
    return await db.task.update({
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
