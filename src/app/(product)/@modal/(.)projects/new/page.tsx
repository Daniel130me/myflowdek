'use client';

import React from 'react';
import { NewProjectModal } from '@/features/flowdeck/components/modals';
import { useProjectCreation } from '@/features/flowdeck/hooks/useProjectCreation';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedNewProjectPage() {
  const { createBlank, createFromTemplate, creating } = useProjectCreation();
  const close = useCloseOverlay(routes.projects());

  return (
    <NewProjectModal
      onClose={close}
      onCreate={createBlank}
      onCreateFromTemplate={createFromTemplate}
      submitting={creating}
    />
  );
}
