'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { FileViewerModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getFileForProject } from '@/features/files/selectors/getFileForProject';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedFileViewerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const fileId = typeof params.fileId === 'string' ? params.fileId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectFiles(projectId));

  const file = getFileForProject(state.filesByProject, projectId, fileId);
  if (!file) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] || [];

  return (
    <FileViewerModal
      file={file}
      allFiles={state.filesByProject[projectId] || []}
      allTasks={tasks}
      onClose={close}
      onNavigateFile={fid => router.push(routes.file(projectId, fid))}
    />
  );
}
