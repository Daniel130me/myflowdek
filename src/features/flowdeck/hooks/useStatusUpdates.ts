'use client';

import { useState, useEffect, useCallback } from 'react';
import type { ProjectStatusUpdate } from '@/features/flowdeck/model';

/** Shape returned by GET /api/projects/:id/status-updates. */
interface ApiStatusUpdate {
  id: string;
  projectId: string;
  authorId: string | null;
  text: string;
  color: string;
  createdAt: string;
}

/** Map the API status-update shape to the frontend type. */
function mapStatusUpdate(api: ApiStatusUpdate): ProjectStatusUpdate {
  return {
    id: api.id,
    projectId: api.projectId,
    authorId: api.authorId ?? '',
    text: api.text,
    color: (api.color === 'yellow' || api.color === 'red' ? api.color : 'green') as 'green' | 'yellow' | 'red',
    createdAt: api.createdAt,
  };
}

/**
 * Hook that fetches status updates for a project from the API.
 * Returns `{ updates, loading, refetch }`.
 */
export function useStatusUpdates(projectId: string | null) {
  const [updates, setUpdates] = useState<ProjectStatusUpdate[]>([]);
  const [loading, setLoading] = useState(false);

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/status-updates`);
      if (!res.ok) return;
      const data = await res.json();
      setUpdates((data.updates ?? []).map(mapStatusUpdate));
    } catch {
      // Network error — leave updates empty.
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { updates, loading, refetch };
}
