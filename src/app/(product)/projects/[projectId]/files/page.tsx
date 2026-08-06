'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { FilesView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectFilesPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const files = state.filesByProject[projectId] ?? [];
  const tasks = state.tasksByProject[projectId] ?? [];

  return (
    <FilesView
      files={files}
      tasks={tasks}
      onAdd={(newFiles) => state.addFiles(projectId, newFiles)}
      onRemove={(fileId) => state.removeFile(projectId, fileId)}
      onLink={(fileId, linkedTaskId) => state.linkFile(projectId, fileId, linkedTaskId)}
      onViewFile={fileId => {
        router.push(routes.file(projectId, fileId));
      }}
    />
  );
}
