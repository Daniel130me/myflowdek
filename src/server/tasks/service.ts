import type { Prisma } from "@prisma/client";

import { createTask, deleteTask, findProjectTasks, updateTask } from "./repository";
import type { CreateTaskInput, UpdateTaskInput } from "./schemas";

function toTaskDates<T extends CreateTaskInput | UpdateTaskInput>(input: T) {
  return {
    ...input,
    startDate: input.startDate ? new Date(input.startDate) : input.startDate,
    dueDate: input.dueDate ? new Date(input.dueDate) : input.dueDate,
  };
}

export function listTasks(projectId: string, filters: { status?: string; assigneeId?: string }) {
  return findProjectTasks(projectId, filters);
}

export function addTask(projectId: string, input: CreateTaskInput) {
  const data = toTaskDates(input);
  return createTask({
    ...data,
    projectId,
    completedAt: data.status === "done" ? new Date() : null,
  });
}

export function editTask(id: string, input: UpdateTaskInput) {
  const data: Prisma.TaskUncheckedUpdateInput = toTaskDates(input);

  if (input.status === "done") data.completedAt = new Date();
  if (input.status && input.status !== "done") data.completedAt = null;

  return updateTask(id, data);
}

export function removeTask(id: string) {
  return deleteTask(id);
}

