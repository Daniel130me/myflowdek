'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { TimelineView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectTimelinePage() {
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
  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  return (
    <TimelineView
      projectId={projectId}
      project={project}
      tasks={filteredTasks}
      onOpenTask={id => {
        router.push(routes.task(projectId, id));
      }}
      onToggleComplete={(id) => state.toggleComplete(projectId, id)}
      onUpdateTask={(id, patch) => state.updateTask(projectId, id, patch)}
      grid={state.gridActions}
    />
  );
}
