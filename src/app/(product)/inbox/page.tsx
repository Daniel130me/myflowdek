'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { InboxView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function InboxRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <InboxView
      tasksByProject={state.tasksByProject}
      commentsByProject={state.commentsByProject}
      activityByProject={state.activityByProject}
      projects={state.projects}
      currentUserId={state.currentUserId}
      onOpenTask={(projectId, taskId) => {
        state.openProject(projectId);
        router.push(routes.task(projectId, taskId));
      }}
    />
  );
}
