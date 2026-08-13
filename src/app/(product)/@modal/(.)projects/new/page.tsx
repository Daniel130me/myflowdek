'use client';

import React from 'react';
import { NewProjectModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedNewProjectPage() {
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projects());

  return (
    <NewProjectModal
      onClose={close}
      onCreate={p => {
        state.createProject(p);
        close();
      }}
      onCreateFromTemplate={(tid, name, color, start, end) => {
        state.createProjectFromTemplate(tid, name, color, start, end);
        close();
      }}
    />
  );
}
