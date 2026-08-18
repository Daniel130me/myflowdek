'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { DependenciesView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectDependenciesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] ?? [];

  return (
    <DependenciesView
      tasks={tasks}
      onOpenTask={id => {
        router.push(routes.task(projectId, id));
      }}
    />
  );
}
