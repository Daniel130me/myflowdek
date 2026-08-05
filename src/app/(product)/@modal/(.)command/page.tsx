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
        router.push(getRouteForView(view, projectId || state.currentProjectId || undefined));
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
      onOpenTask={id => {
        const pId = projectId || state.currentProjectId || Object.keys(state.projects)[0];
        if (pId) router.push(routes.task(pId, id));
        close();
      }}
      onNewTask={() => {
        const pId = projectId || state.currentProjectId || Object.keys(state.projects)[0];
        if (pId) router.push(routes.newTask(pId));
      }}
      onUndo={state.gridActions.onUndo}
      onRedo={state.gridActions.onRedo}
      canUndo={state.gridActions.canUndo}
      canRedo={state.gridActions.canRedo}
      onToggleTheme={() => {}}
    />
  );
}
