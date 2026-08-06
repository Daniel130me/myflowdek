'use client';

import React, { useEffect } from 'react';
import { useParams, notFound } from 'next/navigation';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ProjectLayout({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : Array.isArray(params.projectId) ? params.projectId[0] : '';
  const state = useFlowDeck();

  const projectExists = Boolean(projectId && state.projects[projectId]);

  useEffect(() => {
    if (projectExists && state.currentProjectId !== projectId) {
      state.syncProjectFromRoute(projectId);
    }
  }, [projectId, projectExists, state]);

  if (!projectExists) {
    notFound();
  }

  return <>{children}</>;
}
