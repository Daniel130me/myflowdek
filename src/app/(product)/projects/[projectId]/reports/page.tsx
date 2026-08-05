'use client';

import React from 'react';
import { ReportsView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ProjectReportsPage() {
  const state = useFlowDeck();

  return (
    <ReportsView
      tasks={state.tasks}
    />
  );
}
