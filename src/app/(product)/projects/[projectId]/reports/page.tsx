'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { ReportsView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectReportsPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] ?? [];

  return (
    <ReportsView
      tasks={tasks}
    />
  );
}
