'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CommandPalette } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes, getRouteForView } from '@/shared/navigation/routes';
import { useRouter } from 'next/navigation';

export default function InterceptedCommandPalettePage() {
  const router = useRouter();
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay();

  return (
    <CommandPalette
      open={true}
      onOpenChange={open => {
        if (!open) close();
      }}
      activeView={state.activeView}
      onNavigate={view => {
        router.replace(getRouteForView(view, projectId || undefined));
      }}
      projects={state.projects}
      onOpenProject={id => {
        state.openProject(id);
        router.replace(routes.projectOverview(id));
      }}
      onNewProject={() => {
        router.push(routes.newProject());
      }}
      tasksByProject={state.tasksByProject}
      onOpenTask={(pId, taskId) => {
        router.replace(routes.task(pId, taskId));
      }}
      onNewTask={pid => {
        if (pid) {
          // Keep the current project mounted when launching the task form from
          // the command palette; the shell renders this modal in memory.
          state.openProject(pid);
          state.setShowNewTask(true);
          close();
        } else {
          router.replace(routes.projects());
        }
      }}
    />
  );
}
