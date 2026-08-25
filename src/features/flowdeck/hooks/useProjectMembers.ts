'use client';

import { useEffect } from 'react';
import { useProjectMembersRaw } from './useProjectMembersRaw';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches project members from the API and syncs their user ids
 * into the store so the DashboardView "Manage members" picker reflects real
 * data instead of the mock seed.
 *
 * Returns `{ loading, refetch }`.
 */
export function useProjectMembers(projectId: string | null) {
  const { members, loading, refetch } = useProjectMembersRaw(projectId);
  const { syncProjectMembers } = useFlowDeck();

  useEffect(() => {
    if (projectId) {
      syncProjectMembers(projectId, members.map((m) => m.userId));
    }
  }, [projectId, members, syncProjectMembers]);

  return { loading, refetch };
}
