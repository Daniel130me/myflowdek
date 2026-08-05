'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { PortfolioView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectsPortfolioPage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <PortfolioView
      projects={state.projects}
      tasksByProject={state.tasksByProject}
      searchQuery={state.searchQuery}
      onOpen={id => {
        state.openProject(id);
        router.push(routes.projectOverview(id));
      }}
      onDelete={state.deleteProject}
      onNew={() => router.push(routes.newProject())}
      onToggleFavorite={state.toggleProjectFavorite}
      onArchive={state.archiveProject}
      onRestore={state.restoreProject}
    />
  );
}
