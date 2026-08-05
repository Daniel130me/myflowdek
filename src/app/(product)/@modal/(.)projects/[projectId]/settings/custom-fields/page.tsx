'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { CustomFieldsModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedCustomFieldsPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectOverview(projectId));

  return (
    <CustomFieldsModal
      columns={state.customCols}
      onAdd={state.addColumn}
      onRemove={state.removeColumn}
      onClose={close}
    />
  );
}
