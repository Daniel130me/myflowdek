'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { DuplicateTaskDialog } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedDuplicateTaskPage() {
  const params = useParams();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectTasks(projectId));

  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return null;

  return (
    <DuplicateTaskDialog
      taskName={task.name}
      hasSubtasks={Boolean(task.parentId || state.tasks.some(t => t.parentId === task.id))}
      hasComments={Boolean(state.commentsByProject[projectId]?.some(c => c.taskId === task.id))}
      hasAttachments={Boolean(state.files.some(f => f.linkedTaskId === task.id))}
      onCancel={close}
      onConfirm={opts => {
        state.duplicateTaskWithOptions(task.id, opts);
        close();
      }}
    />
  );
}
