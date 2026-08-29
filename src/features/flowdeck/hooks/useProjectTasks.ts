'use client';

import { useEffect } from 'react';
import { useTasks } from './useTasks';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches tasks for a project from the API and syncs them into
 * the Zustand store so all existing task views + mutations work with real
 * data without rewiring every handler.
 *
 * Returns the fetched tasks as well as syncing them into the shared store.
 * Direct task routes use the returned list immediately, avoiding the extra
 * render required for the store-sync effect to complete.
 */
export function useProjectTasks(projectId: string | null) {
  const { tasks, loading, error, refetch } = useTasks(projectId);
  const { syncProjectTasks } = useFlowDeck();

  // Sync API tasks into the store whenever they change.
  useEffect(() => {
    if (projectId) {
      syncProjectTasks(projectId, tasks);
    }
  }, [projectId, tasks, syncProjectTasks]);

  return { tasks, loading, error, refetch };
}
