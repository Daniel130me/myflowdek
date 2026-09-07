'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { RaidView } from '@/features/flowdeck/components/views';
import { LoadErrorPanel } from '@/components/ui/load-error';
import { useProjectRaid } from '@/features/flowdeck/hooks/useProjectRaid';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { COLORS, FF } from '@/features/flowdeck/model';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectRaidPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  // Hydrate the RAID log from the server. Audit C-01: entries used to live
  // only in React state, so everything was lost on refresh.
  const { loading, error, refetch } = useProjectRaid(projectId ?? null);

  if (!projectId) {
    notFound();
  }

  const raidItems = state.raidByProject[projectId] ?? [];

  if (error) {
    return <LoadErrorPanel title="Could not load the RAID log" onRetry={refetch} />;
  }

  if (loading && raidItems.length === 0) {
    return (
      <div style={{ padding: 24, textAlign: 'center', color: COLORS.gray, fontSize: 13, fontFamily: FF }}>
        Loading RAID log…
      </div>
    );
  }

  return (
    <RaidView
      items={raidItems}
      projectId={projectId}
      onAdd={(input) => state.addRaidItem(projectId, input)}
      onUpdate={(id, patch) => state.updateRaidItem(projectId, id, patch)}
      onRemove={(id) => state.removeRaidItem(projectId, id)}
    />
  );
}
