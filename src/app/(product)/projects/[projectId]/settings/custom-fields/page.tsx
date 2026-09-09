'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProjectOverviewPage from '../../overview/page';
import { CustomFieldsModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useConfirmDialog } from '@/features/flowdeck/components/ui';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function CustomFieldsRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const confirmDialog = useConfirmDialog();
  const close = () => router.push(routes.projectOverview(projectId));

  const columns = state.customColsByProject[projectId] ?? [];

  // Deleting a field definition cascades away every saved value — the confirm
  // must say how much is about to disappear (audit Table 7.1).
  const removeFieldWithConfirm = (key: string) => {
    const col = columns.find(c => c.key === key);
    const affected = state.tasks.filter(
      t => t.customFields && t.customFields[key] != null && t.customFields[key] !== '',
    ).length;
    void confirmDialog({
      title: `Delete field "${col?.label ?? key}"?`,
      description: affected > 0
        ? `Every value entered in this field is removed with it — ${affected} task value${affected === 1 ? '' : 's'} on this project. This cannot be undone.`
        : 'No task currently uses this field. This cannot be undone.',
      confirmLabel: 'Delete field',
    }).then(ok => { if (ok) state.removeColumn(projectId, key); });
  };

  return (
    <>
      <ProjectOverviewPage />
      <CustomFieldsModal
        columns={columns}
        onAdd={col => state.addColumn(projectId, col)}
        onRemove={removeFieldWithConfirm}
        onRename={(key, label) => state.renameColumn(projectId, key, label)}
        onClose={close}
      />
    </>
  );
}
