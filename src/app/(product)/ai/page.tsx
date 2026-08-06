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
      onAddTask={(task) => state.addTask(state.currentProjectId!, task)}
      onUpdateTask={(id, patch) => state.updateTask(state.currentProjectId!, id, patch)}
    />
  );
}
