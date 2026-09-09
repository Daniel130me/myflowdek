'use client';

import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectTasks } from './useProjectTasks';
import type { Task } from '@/features/flowdeck/model';

/**
 * Resolve a task for an overlay route (/tasks/<taskId>/…) rendered on top
 * of a project page.
 *
 * The client store alone is NOT enough: a direct URL or a bookmark starts
 * with an empty store, so a store-only lookup 404s before any fetch has
 * even been attempted (audit Table 5.1 — the duplicate-task dialog).
 * This mirrors the task-detail page's contract:
 *
 *   - `task`            — the resolved task, or null while unresolved
 *   - `loading`         — true until the project tasks request settles
 *   - `error`           — request failure message, if any
 *   - `confirmedMiss`   — true only when loading finished without error
 *                         and the task is genuinely absent → safe to 404
 *
 * Callers render skeleton → load-error (retry) → 404 in that order.
 */
export function useTaskForRoute(projectId: string, taskId: string) {
  const state = useFlowDeck();
  const { tasks: fetchedTasks, loading, error, refetch } = useProjectTasks(projectId);

  // Prefer the store cache (fresh after client-side navigation); fall back
  // to the fetched list (direct URLs / bookmarks).
  const cachedTask = (state.tasksByProject[projectId] ?? []).find(t => t.id === taskId);
  const task: Task | null = cachedTask ?? fetchedTasks.find(t => t.id === taskId) ?? null;

  const confirmedMiss = !task && !loading && !error;

  return {
    task,
    projectTasks: fetchedTasks,
    loading,
    error,
    refetch,
    confirmedMiss,
  };
}
