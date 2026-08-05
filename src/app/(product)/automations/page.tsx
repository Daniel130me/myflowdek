'use client';

import React from 'react';
import { AutomationsView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function AutomationsRoutePage() {
  const state = useFlowDeck();

  return (
    <AutomationsView
      automations={state.automations}
      projects={state.projects}
      tagsByProject={state.tagsByProject}
      currentProjectId={state.currentProjectId}
      onAdd={state.addAutomation}
      onUpdate={state.updateAutomation}
      onDelete={state.deleteAutomation}
    />
  );
}
