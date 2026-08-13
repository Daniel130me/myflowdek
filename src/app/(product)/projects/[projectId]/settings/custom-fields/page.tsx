'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProjectOverviewPage from '../../overview/page';
import { CustomFieldsModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function CustomFieldsRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = () => router.push(routes.projectOverview(projectId));

  const columns = state.customColsByProject[projectId] ?? [];

  return (
    <>
      <ProjectOverviewPage />
      <CustomFieldsModal
        columns={columns}
        onAdd={col => state.addColumn(projectId, col)}
        onRemove={id => state.removeColumn(projectId, id)}
        onClose={close}
      />
    </>
  );
}
