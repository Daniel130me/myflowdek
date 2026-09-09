'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { DependenciesView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectDependenciesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  // Deep links start with an empty store — without this fetch the view
  // always read "No dependencies found" for projects that have many
  // (audit Table 5.1).
  useProjectTasks(projectId);

  if (!projectId) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] ?? [];

  return (
    <DependenciesView
      projectId={projectId}
      tasks={tasks}
      onOpenTask={id => {
        router.push(routes.task(projectId, id));
      }}
    />
  );
}
