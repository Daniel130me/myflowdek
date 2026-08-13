'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import ProjectFilesPage from '../page';
import { FileViewerModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getFileForProject } from '@/features/files/selectors/getFileForProject';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function FileViewerRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const fileId = getSingleParam(params.fileId);
  const state = useFlowDeck();

  const file = getFileForProject(state.filesByProject, projectId, fileId);
  if (!file) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] || [];

  return (
    <>
      <ProjectFilesPage />
      <FileViewerModal
        file={file}
        allFiles={state.filesByProject[projectId] || []}
        allTasks={tasks}
        onClose={() => router.push(routes.projectFiles(projectId))}
        onNavigateFile={fid => router.push(routes.file(projectId, fid))}
      />
    </>
  );
}
