'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { FilesView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectFilesPage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <FilesView
      files={state.files}
      tasks={state.tasks}
      onAdd={state.addFiles}
      onRemove={state.removeFile}
      onLink={state.linkFile}
      onViewFile={fileId => {
        if (state.currentProjectId) {
          router.push(routes.file(state.currentProjectId, fileId));
        }
      }}
    />
  );
}
