import type { Task } from '@/features/flowdeck/model';

export function getTaskForProject(
  tasksByProject: Record<string, Task[]>,
  projectId: string,
  taskId: string
): Task | null {
  if (!projectId || !taskId || !tasksByProject[projectId]) {
    return null;
  }
  return tasksByProject[projectId].find(task => task.id === taskId) ?? null;
}
