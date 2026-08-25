'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CustomFieldsModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function InterceptedCustomFieldsPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectOverview(projectId));

  const columns = state.customColsByProject[projectId] ?? [];

  return (
    <CustomFieldsModal
      columns={columns}
      onAdd={col => state.addColumn(projectId, col)}
      onRemove={id => state.removeColumn(projectId, id)}
      onClose={close}
    />
  );
}
