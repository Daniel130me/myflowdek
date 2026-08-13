'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Task, TaskStatus, TaskPriority } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id/tasks. */
interface ApiTask {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  duration: number;
  progress: number;
  sortOrder: number;
  isMilestone: boolean;
  recurrence?: string | null;
  assigneeId: string | null;
  parentId: string | null;
  sectionId: string | null;
  completedAt: string | null;
  createdAt?: string;
  /** Relationship collections — hydrated by `listTasks` via Prisma relations. */
  dependencies?: { dependsOnId: string }[];
  tags?: { tagId: string }[];
  followers?: { userId: string }[];
  /** Per-task custom-field values joined with the field's `key`. (item 4) */
  customFieldValues?: {
    fieldId: string;
    value: string | null;
    field: { key: string };
  }[];
}

/**
 * Map the API task shape to the frontend Task type.
 *
 * Custom-field values are joined onto the task as `customFields: Record<key,
 * value>` so the existing UI (SheetView, TaskDetailPanel) can read/write them
 * without changes. Empty/null values are skipped so the record only contains
 * actually-populated fields.
 */
function mapTask(api: ApiTask): Task {
  const customFields: Record<string, string> | undefined =
    api.customFieldValues && api.customFieldValues.length > 0
      ? api.customFieldValues.reduce<Record<string, string>>((acc, v) => {
          if (v.value !== null && v.value !== '') acc[v.field.key] = v.value;
          return acc;
        }, {})
      : undefined;
  return {
    id: api.id,
    projectId: api.projectId,
    name: api.name,
    description: api.description ?? undefined,
    status: api.status as TaskStatus,
    assignee: api.assigneeId ?? '',
    start: api.startDate ?? '',
    duration: api.duration,
    dueDate: api.dueDate ?? undefined,
    progress: api.progress,
    priority: api.priority as TaskPriority,
    deps: (api.dependencies ?? []).map(d => d.dependsOnId),
    tags: (api.tags ?? []).map(t => t.tagId),
    followers: (api.followers ?? []).map(f => f.userId),
    parentId: api.parentId ?? null,
    sectionId: api.sectionId ?? null,
    milestone: api.isMilestone,
    recurrence: api.recurrence ?? null,
    createdAt: api.createdAt ?? undefined,
    ...(customFields ? { customFields } : {}),
  };
}

/**
 * Hook that fetches tasks for a project from the API.
 * Returns `{ tasks, loading, error, refetch, createTask }`.
 */
export function useTasks(projectId: string | null) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/tasks`);
      if (!res.ok) throw new Error('Failed to load tasks');
      const data = await res.json();
      setTasks((data.tasks ?? []).map(mapTask));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const createTask = useCallback(
    async (input: { name: string; description?: string; status?: string; priority?: string }) => {
      if (!projectId) return null;
      const res = await fetch(`/api/projects/${projectId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!res.ok) throw new Error('Failed to create task');
      const data = await res.json();
      const mapped = mapTask(data.task as ApiTask);
      setTasks((prev) => [...prev, mapped]);
      return mapped;
    },
    [projectId],
  );

  return { tasks, loading, error, refetch, createTask };
}
