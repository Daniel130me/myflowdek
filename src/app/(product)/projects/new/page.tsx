'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import ProjectsPortfolioPage from '../page';
import { NewProjectModal } from '@/features/flowdeck/components/modals';
import { useProjectCreation } from '@/features/flowdeck/hooks/useProjectCreation';
import { routes } from '@/shared/navigation/routes';

export default function NewProjectRoutePage() {
  const router = useRouter();
  const { createBlank, createFromTemplate, creating } = useProjectCreation();
  const close = () => router.push(routes.projects());

  return (
    <>
      <ProjectsPortfolioPage />
      <NewProjectModal
        onClose={close}
        onCreate={createBlank}
        onCreateFromTemplate={createFromTemplate}
        submitting={creating}
      />
    </>
  );
}
