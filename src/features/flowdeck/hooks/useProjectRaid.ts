'use client';

import { useEffect, useState } from 'react';
import { apiListRaidItems } from '@/lib/api-client';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import type { RaidItem } from '@/features/flowdeck/model';

/**
 * Hook that fetches the project's RAID log items from
 * GET /api/projects/:id/raid and syncs them into the store so the RAID view
 * works off canonical server data.
 *
 * The sync only fires when the API responded successfully — a network error
 * must not wipe locally-optimistic items. Returns `{ loading, refetch }`;
 * the items themselves are read from the store (`raidByProject`).
 */
export function useProjectRaid(projectId: string | null) {
  const { syncRaidItems } = useFlowDeck();
  const [loading, setLoading] = useState(true);
  const [ok, setOk] = useState(true);

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const res = await apiListRaidItems(projectId);
      if (cancelled) return;
      if (res.ok) {
        syncRaidItems(projectId, res.items as RaidItem[]);
        setOk(true);
      } else {
        setOk(false);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [projectId, syncRaidItems]);

  async function refetch() {
    if (!projectId) return;
    const res = await apiListRaidItems(projectId);
    if (res.ok) syncRaidItems(projectId, res.items as RaidItem[]);
  }

  return { loading, ok, refetch };
}
