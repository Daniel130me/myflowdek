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
          router.push(getRouteForView(view));
          close();
        }}
        projects={state.projects}
        onOpenProject={id => {
          state.openProject(id);
          router.push(routes.projectOverview(id));
          close();
        }}
        onNewProject={() => {
          router.push(routes.newProject());
        }}
        tasksByProject={state.tasksByProject}
        onOpenTask={(taskId: string) => {
          const pId = state.currentProjectId || Object.keys(state.projects)[0];
          if (pId) router.push(routes.task(pId, taskId));
          close();
        }}
        onNewTask={() => {
          const pId = state.currentProjectId || Object.keys(state.projects)[0];
          if (pId) router.push(routes.newTask(pId));
        }}
        onUndo={state.gridActions.onUndo}
        onRedo={state.gridActions.onRedo}
        canUndo={state.gridActions.canUndo}
        canRedo={state.gridActions.canRedo}
        onToggleTheme={() => {}}
      />
    </>
  );
}
