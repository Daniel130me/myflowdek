'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ShareModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedSharePage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectOverview(projectId));

  const project = state.projects[projectId];
  if (!project) return null;

  return (
    <ShareModal
      project={project}
      onClose={close}
    />
  );
}
