'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DashboardView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectOverviewPage() {
  const router = useRouter();
  const state = useFlowDeck();

  if (!state.project) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>
        Loading project details…
      </div>
    );
  }

  return (
    <DashboardView
      project={state.project}
      tasks={state.tasks}
      files={state.files}
      statusUpdates={state.projectStatusUpdates}
      onUpdateProject={state.updateProject}
      onToggleFavorite={state.toggleProjectFavorite}
      onArchive={state.archiveProject}
      onSetMembers={state.setProjectMembers}
      onAddStatusUpdate={state.addProjectStatusUpdate}
      onDeleteStatusUpdate={state.deleteProjectStatusUpdate}
      onSaveAsTemplate={state.saveProjectAsTemplate}
      onOpenTask={taskId => router.push(routes.task(state.project!.id, taskId))}
    />
  );
}
