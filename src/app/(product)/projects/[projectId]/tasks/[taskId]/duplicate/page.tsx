'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProjectTasksPage from '../../page';
import { DuplicateTaskDialog } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function DuplicateTaskRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const taskId = getSingleParam(params.taskId);
  const state = useFlowDeck();
  const close = () => router.push(routes.projectTasks(projectId));

  const projectTasks = state.tasksByProject[projectId] ?? [];
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];

  const task = projectTasks.find(t => t.id === taskId);

  return (
    <>
      <ProjectTasksPage />
      {task && (
        <DuplicateTaskDialog
          taskName={task.name}
          hasSubtasks={Boolean(task.parentId || projectTasks.some(t => t.parentId === task.id))}
          hasComments={Boolean(projectComments.some(c => c.taskId === task.id))}
          hasAttachments={Boolean(projectFiles.some(f => f.linkedTaskId === task.id))}
          onCancel={close}
          onConfirm={opts => {
            state.duplicateTaskWithOptions(task.id, opts);
            close();
          }}
        />
      )}
    </>
  );
}
