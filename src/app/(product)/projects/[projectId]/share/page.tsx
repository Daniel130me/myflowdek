'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProjectOverviewPage from '../overview/page';
import { ShareModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ShareRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = () => router.push(routes.projectOverview(projectId));

  const project = state.projects[projectId];

  return (
    <>
      <ProjectOverviewPage />
      {project && (
        <ShareModal
          project={project}
          onClose={close}
        />
      )}
    </>
  );
}
