'use client';

import React from 'react';
import { TimesheetView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function TimesheetsRoutePage() {
  const state = useFlowDeck();

  return (
    <TimesheetView
      timesheets={state.timesheets}
      projects={state.projects}
      tasks={state.tasks}
      currentProjectId={state.currentProjectId}
      currentUserId={state.currentUserId}
      onAddEntry={state.addTimesheetEntry}
      onUpdateEntry={state.updateTimesheetEntry}
      onDeleteEntry={state.deleteTimesheetEntry}
    />
  );
}
