'use client';

import React from 'react';
import { FormsView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function FormsRoutePage() {
  const state = useFlowDeck();

  return (
    <FormsView
      forms={state.forms}
      submissions={state.submissions}
      projects={state.projects}
      currentProjectId={state.currentProjectId}
      onAddForm={state.addForm}
      onUpdateForm={state.updateForm}
      onDeleteForm={state.deleteForm}
    />
  );
}
