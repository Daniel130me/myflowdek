'use client';

import React from 'react';
import { RaidView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ProjectRaidPage() {
  const state = useFlowDeck();

  return (
    <RaidView
      items={state.raidItems}
      onAdd={state.addRaidItem}
      onUpdate={state.updateRaidItem}
      onRemove={state.removeRaidItem}
    />
  );
}
