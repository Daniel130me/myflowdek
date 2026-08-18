'use client';

import { useEffect } from 'react';
import { useFiles } from './useFiles';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

/**
 * Hook that fetches files for a project from the API and syncs them into
 * the Zustand store so the FilesView and board use real data.
 *
 * Returns `{ loading, refetch }`.
 */
export function useProjectFiles(projectId: string | null) {
  const { files, loading, refetch } = useFiles(projectId);
  const { syncProjectFiles } = useFlowDeck();

  useEffect(() => {
    if (projectId) {
      syncProjectFiles(projectId, files);
    }
  }, [projectId, files, syncProjectFiles]);

  return { loading, refetch };
}
