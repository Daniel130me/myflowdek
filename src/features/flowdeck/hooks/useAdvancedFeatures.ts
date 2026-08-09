'use client';

import { useState, useEffect, useCallback } from 'react';

/**
 * Generic API hook factory — fetches data from a URL on mount and exposes
 * a refetch function. Used by all advanced feature hooks to avoid repeating
 * the same fetch + state management boilerplate.
 *
 * Returns `{ data, loading, error, refetch }`.
 */
export function useApiFetch<T>(
  url: string | null,
  defaultValue: T,
): {
  data: T;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
} {
  const [data, setData] = useState<T>(defaultValue);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!url) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

/** Goals hook — fetches workspace goals. */
export function useGoals(workspaceId: string | null) {
  return useApiFetch(
    workspaceId ? `/api/workspaces/${workspaceId}/goals` : null,
    { goals: [] },
  );
}

/** Approvals hook — fetches project approvals. */
export function useApprovals(projectId: string | null) {
  return useApiFetch(
    projectId ? `/api/projects/${projectId}/approvals` : null,
    { approvals: [] },
  );
}

/** Forms hook — fetches project forms. */
export function useForms(projectId: string | null) {
  return useApiFetch(
    projectId ? `/api/projects/${projectId}/forms` : null,
    { forms: [] },
  );
}

/** Automations hook — fetches project automation rules. */
export function useAutomations(projectId: string | null) {
  return useApiFetch(
    projectId ? `/api/projects/${projectId}/automations` : null,
    { automations: [] },
  );
}

/** Budgets hook — fetches project budgets. */
export function useBudgets(projectId: string | null) {
  return useApiFetch(
    projectId ? `/api/projects/${projectId}/budgets` : null,
    { budgets: [] },
  );
}

/** Timesheets hook — fetches the current user's timesheet entries. */
export function useTimesheets(projectId?: string | null) {
  const url = projectId
    ? `/api/timesheets?projectId=${projectId}`
    : '/api/timesheets';
  return useApiFetch(url, { entries: [] });
}

/** Workload report hook — fetches per-member workload for a project. */
export function useWorkload(projectId: string | null) {
  return useApiFetch(
    projectId ? `/api/projects/${projectId}/reports/workload` : null,
    { workload: [] },
  );
}

/** Portfolio report hook — fetches workspace portfolio summary. */
export function usePortfolio(workspaceId: string | null) {
  return useApiFetch(
    workspaceId ? `/api/workspaces/${workspaceId}/reports/portfolio` : null,
    { portfolio: [] },
  );
}

/** Notifications hook — fetches the user's notifications + unread count. */
export function useNotifications() {
  return useApiFetch('/api/notifications', { notifications: [], unreadCount: 0 });
}

/** Activity feed hook — fetches activity for a task. */
export function useTaskActivity(taskId: string | null) {
  return useApiFetch(
    taskId ? `/api/tasks/${taskId}/activity` : null,
    { activity: [] },
  );
}
