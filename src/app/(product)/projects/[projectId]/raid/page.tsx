'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { RaidView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectRaidPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const raidItems = state.raidByProject[projectId] ?? [];

  return (
    <RaidView
      items={raidItems}
      onAdd={(item) => state.addRaidItem(projectId, item)}
      onUpdate={(id, patch) => state.updateRaidItem(projectId, id, patch)}
      onRemove={(id) => state.removeRaidItem(projectId, id)}
    />
  );
}
