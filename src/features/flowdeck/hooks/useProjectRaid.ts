'use client';

import { useState, useEffect, useCallback } from 'react';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { mapApiRaidItem, type ApiRaidItem, type RaidItem } from '@/features/flowdeck/model';

/**
 * Hook that fetches a project's RAID log from the API and syncs it into the
 * Zustand store — mirrors `useProjectComments`.
 *
 * Audit C-01: the RAID log previously lived only in React state, so every
 * risk/assumption/issue/dependency was silently destroyed on refresh and
 * never visible to other team members.
 *
 * Returns `{ items, loading, error, refetch }`.
 */
export function useProjectRaid(projectId: string | null) {
  const [items, setItems] = useState<RaidItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { syncProjectRaid } = useFlowDeck();

  const refetch = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/projects/${projectId}/raid`);
      if (!res.ok) throw new Error('Failed to load RAID log');
      const data = await res.json();
      const mapped = ((data.items ?? []) as ApiRaidItem[]).map(mapApiRaidItem);
      setItems(mapped);
      syncProjectRaid(projectId, mapped);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load RAID log');
    } finally {
      setLoading(false);
    }
  }, [projectId, syncProjectRaid]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { items, loading, error, refetch };
}
