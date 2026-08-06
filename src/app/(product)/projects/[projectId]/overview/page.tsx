'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { DashboardView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const project = state.projects[projectId];
  if (!project) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] ?? [];
  const files = state.filesByProject[projectId] ?? [];
  const statusUpdates = state.statusUpdatesByProject[projectId] ?? [];

  return (
    <DashboardView
      project={project}
      tasks={tasks}
      files={files}
      statusUpdates={statusUpdates}
      onUpdateProject={state.updateProject}
      onToggleFavorite={state.toggleProjectFavorite}
      onArchive={state.archiveProject}
      onSetMembers={state.setProjectMembers}
      onAddStatusUpdate={(text, color) => state.addProjectStatusUpdate(projectId, text, color)}
      onDeleteStatusUpdate={(updateId) => state.deleteProjectStatusUpdate(projectId, updateId)}
      onSaveAsTemplate={(name, includeTasks) => state.saveProjectAsTemplate(projectId, name, includeTasks)}
      onOpenTask={taskId => router.push(routes.task(projectId, taskId))}
    />
  );
}
