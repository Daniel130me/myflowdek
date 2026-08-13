'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ProjectsPortfolioPage from '../page';
import { NewProjectModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function NewProjectRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();
  const close = () => router.push(routes.projects());

  return (
    <>
      <ProjectsPortfolioPage />
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
    </>
  );
}
