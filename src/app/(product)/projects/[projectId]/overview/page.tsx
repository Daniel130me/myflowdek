'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { DashboardView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProject } from '@/features/flowdeck/hooks/useProject';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { useProjectComments } from '@/features/flowdeck/hooks/useProjectComments';
import { useProjectFiles } from '@/features/flowdeck/hooks/useProjectFiles';
import { useProjectMembers } from '@/features/flowdeck/hooks/useProjectMembers';
import { useProjectStatusUpdates } from '@/features/flowdeck/hooks/useProjectStatusUpdates';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

/**
 * Project overview page — the project details, tasks, files, members, and
 * status updates all come from the real API. Mutations are wired through the
 * shared store (which performs optimistic updates + API persistence +
 * rollback on failure), so any change survives a browser refresh.
 */
export default function ProjectOverviewPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const { project: apiProject, loading } = useProject(projectId);

  // Fetch real tasks, comments, files, members, and status updates from the
  // API and sync into the store.
  useProjectTasks(projectId);
  useProjectComments(projectId);
  useProjectFiles(projectId);
  useProjectMembers(projectId);
  useProjectStatusUpdates(projectId);

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
