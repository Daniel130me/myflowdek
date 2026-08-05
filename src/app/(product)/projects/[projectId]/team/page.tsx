'use client';

import React from 'react';
import { TeamView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ProjectTeamPage() {
  const state = useFlowDeck();

  return (
    <TeamView
      tasks={state.tasks}
      timeLogs={state.timeLogs}
    />
  );
}
