'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DependenciesView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectDependenciesPage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <DependenciesView
      tasks={state.tasks}
      onOpenTask={id => {
        if (state.currentProjectId) {
          router.push(routes.task(state.currentProjectId, id));
        }
      }}
    />
  );
}
