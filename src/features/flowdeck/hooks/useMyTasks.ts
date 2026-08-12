'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import type { Task, TaskStatus, TaskPriority } from '@/features/flowdeck/model';
import { apiUpdateTask } from '@/lib/api-client';

/**
 * Shape returned by GET /api/tasks/my.
 *
 * The endpoint joins each task with its project, so we get a flat list of
 * tasks carrying an embedded `{ id, name, color }` project summary — no
 * second fetch needed for the My Tasks view.
 */
interface ApiMyTask {
  id: string;
  projectId: { id: string; name: string; color: string };
  name: string;
  description: string | null;
  status: string;
  priority: string;
  startDate: string | null;
  dueDate: string | null;
  duration: number;
  progress: number;
  isMilestone: boolean;
  completedAt: string | null;
  parentId: string | null;
  sectionId: string | null;
  createdAt?: string;
}

/** Frontend Task + project metadata for the My Tasks view. */
export interface MyTaskItem extends Task {
  /** Project id, denormalised for convenience (matches Task.projectId). */
  projectId: string;
  /** Embedded project info so the view can render the project label. */
  project: { id: string; name: string; color: string };
}

function mapMyTask(api: ApiMyTask): MyTaskItem {
  return {
    id: api.id,
    projectId: api.projectId.id,
    name: api.name,
    description: api.description ?? undefined,
    status: api.status as TaskStatus,
    // `assignee` is the current user (the API only returns tasks where
    // assigneeId === session.user.id). We leave it blank here — the view
    // resolves the current user's avatar via MemberDirectory + state.currentUserId.
    assignee: '',
    start: api.startDate ?? '',
    duration: api.duration,
    dueDate: api.dueDate ?? undefined,
    progress: api.progress,
    priority: api.priority as TaskPriority,
    deps: [],
    parentId: api.parentId ?? null,
    milestone: api.isMilestone,
    sectionId: api.sectionId ?? null,
    createdAt: api.createdAt ?? undefined,
    project: api.projectId,
  };
}

/**
 * Hook that fetches all tasks assigned to the current user across all
 * accessible projects.
 *
 * Replaces the old pattern of reading from `state.tasksByProject` with
 * `CURRENT_USER_ID` — the server now resolves the current user from the
 * session and returns a single canonical list.
 *
 * The hook also exposes a `toggleComplete(taskId)` helper that performs an
 * optimistic local update + `PATCH /api/tasks/:id` and refetches on
 * failure. This keeps the My Tasks view self-contained: it doesn't need
 * to mutate the shared project-scoped store just to flip a checkbox.
 *
 * @param status Optional status filter (?status=backlog|in_progress|review|done)
 * @param limit  Optional cap on the number of tasks returned (default 100, max 200)
 */
export function useMyTasks(status?: string, limit?: number) {
  const [tasks, setTasks] = useState<MyTaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Track the latest fetch token so an in-flight refetch can be ignored if
  // a newer one supersedes it (prevents races when status/limit change
  // quickly).
  const fetchTokenRef = useRef(0);

  const refetch = useCallback(async () => {
    const token = ++fetchTokenRef.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      if (limit) params.set('limit', String(limit));
      const qs = params.toString();
      const url = `/api/tasks/my${qs ? `?${qs}` : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load your tasks');
      const data = await res.json();
      // Ignore stale responses — a newer refetch may have already started.
      if (token !== fetchTokenRef.current) return;
      setTasks((data.tasks ?? []).map(mapMyTask));
    } catch (err) {
      if (token !== fetchTokenRef.current) return;
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      if (token === fetchTokenRef.current) setLoading(false);
    }
  }, [status, limit]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  /**
   * Optimistically toggle a task's completion state in the local list and
   * persist via `PATCH /api/tasks/:id`. On failure, refetch to restore the
   * server's canonical state.
   */
  const toggleComplete = useCallback(async (taskId: string) => {
    let reverted = false;
    setTasks(prev => prev.map(t => {
      if (t.id !== taskId) return t;
      const newStatus = t.status === 'done' ? 'in_progress' : 'done';
      return {
        ...t,
        status: newStatus,
        progress: newStatus === 'done' ? 100 : 0,
      };
    }));
    // Read the (pre-update) task to compute the new status for the API call.
    const before = tasks.find(t => t.id === taskId);
    const newStatus: TaskStatus = before?.status === 'done' ? 'in_progress' : 'done';
    const res = await apiUpdateTask(taskId, {
      status: newStatus,
      progress: newStatus === 'done' ? 100 : 0,
    });
    if (!res.ok) {
      reverted = true;
      toast.error('Failed to update task', { description: res.error });
      // Refetch to restore the server's view of this task.
      void refetch();
    }
    return !reverted;
  }, [tasks, refetch]);

  return { tasks, loading, error, refetch, toggleComplete };
}
