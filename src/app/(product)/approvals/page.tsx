'use client';

import React from 'react';
import { ApprovalsView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ApprovalsRoutePage() {
  const state = useFlowDeck();

  return (
    <ApprovalsView
      approvals={state.approvals}
      projects={state.projects}
      currentProjectId={state.currentProjectId}
      tasks={state.tasks}
      currentUserId={state.currentUserId}
      onAddApproval={state.addApproval}
      onResolveApproval={state.resolveApproval}
      onDeleteApproval={state.deleteApproval}
    />
  );
}
