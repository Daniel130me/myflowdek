'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MyTasksView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function MyTasksRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <MyTasksView
      tasksByProject={state.tasksByProject}
      tagsByProject={state.tagsByProject}
      onOpenTask={(taskId, projectId) => {
        state.openProject(projectId);
        router.push(routes.task(projectId, taskId));
      }}
      onToggleComplete={(taskId, projectId) => {
        state.toggleComplete(taskId);
      }}
    />
  );
}
