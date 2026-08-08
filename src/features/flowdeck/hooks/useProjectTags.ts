'use client';

import { useEffect } from 'react';
import { useTags } from './useTags';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches tags for a project from the API and syncs them into
 * the Zustand store so all existing tag-consuming views work with real data.
 *
 * Returns `{ loading, refetch }`.
 */
export function useProjectTags(projectId: string | null) {
  const { tags, loading, refetch } = useTags(projectId);
  const { syncProjectTags } = useFlowDeck();

  useEffect(() => {
    if (projectId) {
      syncProjectTags(projectId, tags);
    }
  }, [projectId, tags, syncProjectTags]);

  return { loading, refetch };
}
