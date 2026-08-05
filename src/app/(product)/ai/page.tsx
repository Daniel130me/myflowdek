'use client';

import React from 'react';
import { AIAssistantView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function AiAssistantRoutePage() {
  const state = useFlowDeck();

  return (
    <AIAssistantView
      projects={state.projects}
      tasks={state.tasks}
      currentProjectId={state.currentProjectId}
      currentUserId={state.currentUserId}
      onAddTask={state.addTask}
      onUpdateTask={state.updateTask}
    />
  );
}
