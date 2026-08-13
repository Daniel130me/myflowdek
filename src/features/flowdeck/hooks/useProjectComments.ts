'use client';

import { useEffect } from 'react';
import { useComments } from './useComments';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches comments for a project from the API and syncs them into
 * the Zustand store so the CommentsSection and task detail panel use real
 * data.
 *
 * Returns `{ loading, refetch }`.
 */
export function useProjectComments(projectId: string | null) {
  const { comments, loading, refetch } = useComments(projectId);
  const { syncProjectComments } = useFlowDeck();

  useEffect(() => {
    if (projectId) {
      syncProjectComments(projectId, comments);
    }
  }, [projectId, comments, syncProjectComments]);

  return { loading, refetch };
}
