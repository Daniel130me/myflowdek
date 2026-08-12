import type { Prisma } from "@prisma/client";

import { db } from "@/server/db/client";

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
  completedAt: true,
  assigneeId: true,
  createdById: true,
  parentId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function findProjectTasks(
  projectId: string,
  filters: { status?: string; assigneeId?: string },
) {
  return db.task.findMany({
    where: { projectId, ...filters },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: taskSelect,
  });
}

export function createTask(data: Prisma.TaskUncheckedCreateInput) {
  return db.task.create({ data, select: taskSelect });
}

export function updateTask(id: string, data: Prisma.TaskUncheckedUpdateInput) {
  return db.task.update({ where: { id }, data, select: taskSelect });
}

export function deleteTask(id: string) {
  return db.task.delete({ where: { id }, select: { id: true } });
}

