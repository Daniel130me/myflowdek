'use client';

import { useEffect } from 'react';
import { useTasks } from './useTasks';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches tasks for a project from the API and syncs them into
 * the Zustand store so all existing task views + mutations work with real
 * data without rewiring every handler.
 *
 * Returns `{ loading, refetch }` — the tasks themselves are read from the
 * store (which has been populated from the API).
 */
export function useProjectTasks(projectId: string | null) {
  const { tasks, loading, refetch } = useTasks(projectId);
  const { syncProjectTasks } = useFlowDeck();

  // Sync API tasks into the store whenever they change.
  useEffect(() => {
    if (projectId) {
      syncProjectTasks(projectId, tasks);
    }
  }, [projectId, tasks, syncProjectTasks]);

  return { loading, refetch };
}
