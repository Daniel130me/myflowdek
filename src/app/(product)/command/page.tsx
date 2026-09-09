'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ProjectsPortfolioPage from '../projects/page';
import { CommandPalette } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes, getRouteForView } from '@/shared/navigation/routes';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';

export default function CommandRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();
  // Real route = hard navigation (deep link/bookmark/refresh). Closing must
  // stay in-app: push the fallback instead of router.back(), which can exit
  // the site when the previous history entry is not ours (audit Table 5.1).
  const close = useCloseOverlay(routes.projects(), 'fallback-first');

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
      />
    </>
  );
}
