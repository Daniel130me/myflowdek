'use client';

import { useEffect } from 'react';
import { useStatusUpdates } from './useStatusUpdates';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches status updates for a project from the API and syncs them
 * into the Zustand store so the DashboardView status tab uses real data.
 *
 * Returns `{ loading, refetch }` — the updates themselves are read from the
 * store (which has been populated from the API).
 */
export function useProjectStatusUpdates(projectId: string | null) {
  const { updates, loading, refetch } = useStatusUpdates(projectId);
  const { syncProjectStatusUpdates } = useFlowDeck();

  useEffect(() => {
    if (projectId) {
      syncProjectStatusUpdates(projectId, updates);
    }
  }, [projectId, updates, syncProjectStatusUpdates]);

  return { loading, refetch };
}
