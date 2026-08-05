'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FileViewerModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedFileViewerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const fileId = typeof params.fileId === 'string' ? params.fileId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectFiles(projectId));

  const file = state.files.find(f => f.id === fileId);
  if (!file) return null;

  const tasks = state.tasksByProject[projectId] || state.tasks;

  return (
    <FileViewerModal
      file={file}
      allFiles={state.files}
      allTasks={tasks}
      onClose={close}
      onNavigateFile={fid => router.push(routes.file(projectId, fid))}
    />
  );
}
