'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { TeamView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectTeamPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] ?? [];
  const timeLogs = state.timeLogsByProject[projectId] ?? [];

  return (
    <TeamView
      tasks={tasks}
      timeLogs={timeLogs}
    />
  );
}
