'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ProjectsPortfolioPage from '../projects/page';
import { CommandPalette } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes, getRouteForView } from '@/shared/navigation/routes';

export default function CommandRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();
  const close = () => router.back();

  return (
    <>
      <ProjectsPortfolioPage />
      <CommandPalette
        open={true}
        onOpenChange={open => {
          if (!open) close();
        }}
        activeView={state.activeView}
        onNavigate={view => {
          router.replace(getRouteForView(view));
        }}
        projects={state.projects}
        onOpenProject={id => {
          state.openProject(id);
          router.replace(routes.projectOverview(id));
        }}
        onNewProject={() => {
          router.replace(routes.newProject());
        }}
        tasksByProject={state.tasksByProject}
        onOpenTask={(pId: string, taskId: string) => {
          router.replace(routes.task(pId, taskId));
        }}
        onNewTask={projectId => {
          if (projectId) {
            router.replace(routes.newTask(projectId));
          } else {
            router.replace(routes.projects());
          }
        }}
        onUndo={state.gridActions.onUndo}
        onRedo={state.gridActions.onRedo}
        canUndo={state.gridActions.canUndo}
        canRedo={state.gridActions.canRedo}
      />
    </>
  );
}
