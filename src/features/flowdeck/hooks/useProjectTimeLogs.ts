'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import type { TimeLog } from '@/features/flowdeck/model';

/**
 * Hook that fetches a project's time logs from the API and syncs them into
 * the store, so Time Tracking (task detail) and workload views keep showing
 * logged work after a reload.
 *
 * Audit H-09: the store started at {} and only optimistic add/delete touched
 * it — every reload showed 0h logged even though the rows exist in Postgres.
 *
 * One project-level GET hydrates all tasks in a single query instead of one
 * request per task. The sync only fires on success, so a failed fetch never
 * wipes entries the user added optimistically this session.
 */
export function useProjectTimeLogs(projectId: string | null) {
  const [loading, setLoading] = useState(false);
  const [ok, setOk] = useState(false);
  const { syncProjectTimeLogs } = useFlowDeck();

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/time-logs`);
      if (!res.ok) {
        setOk(false);
        return;
      }
      const data = (await res.json()) as { timeLogs: TimeLog[] };
      syncProjectTimeLogs(projectId, data.timeLogs ?? []);
      setOk(true);
    } catch {
      setOk(false);
    } finally {
      setLoading(false);
    }
  }, [projectId, syncProjectTimeLogs]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { loading, ok, refetch };
}
