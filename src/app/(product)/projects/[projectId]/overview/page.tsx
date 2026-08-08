'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { DashboardView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProject } from '@/features/flowdeck/hooks/useProject';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

/**
 * Project overview page — the project details come from the real API
 * (GET /api/projects/:id). Task, file, and status-update data still come
 * from the mock store until those backends are wired in later phases.
 */
export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const { project: apiProject, loading } = useProject(projectId);

  if (!projectId) {
    notFound();
  }

  // While loading, show a placeholder.
  if (loading && !apiProject) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9CA3AF' }}>
        Loading project…
      </div>
    );
  }

  // Fall back to the mock store project if the API hasn't loaded yet (keeps
  // the UI responsive during the transition to fully real data).
  const mockProject = projectId ? state.projects[projectId] : undefined;
  const project = apiProject ?? mockProject;
  if (!project) {
    notFound();
  }

  // Tasks/files/status still from mock store — will be wired to real APIs
  // in subsequent phases.
  const tasks = state.tasksByProject[projectId!] ?? [];
  const files = state.filesByProject[projectId!] ?? [];
  const statusUpdates = state.statusUpdatesByProject[projectId!] ?? [];

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
      onAddStatusUpdate={(text, color) => state.addProjectStatusUpdate(projectId!, text, color)}
      onDeleteStatusUpdate={(updateId) => state.deleteProjectStatusUpdate(projectId!, updateId)}
      onSaveAsTemplate={(name, includeTasks) => state.saveProjectAsTemplate(projectId!, name, includeTasks)}
      onOpenTask={taskId => router.push(routes.task(projectId!, taskId))}
    />
  );
}
