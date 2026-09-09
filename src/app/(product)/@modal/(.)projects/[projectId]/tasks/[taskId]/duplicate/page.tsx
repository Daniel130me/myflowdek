'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { DuplicateTaskDialog } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { useTaskForRoute } from '@/features/flowdeck/hooks/useTaskForRoute';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';
import { TaskDetailSkeleton } from '@/components/ui/skeleton';
import { TaskLoadError } from '@/components/ui/task-load-error';

export default function InterceptedDuplicateTaskPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const taskId = getSingleParam(params.taskId);
  const state = useFlowDeck();

  // Same fetch-then-404 contract as the non-intercepted route (audit
  // Table 5.1): resolve through useTaskForRoute so soft navigation never
  // 404s merely because the store has not finished hydrating.
  const { task, projectTasks: fetchedTasks, loading, error, refetch, confirmedMiss } =
    useTaskForRoute(projectId ?? '', taskId ?? '');

  if (!projectId || !taskId || confirmedMiss) {
    notFound();
  }

  const close = useCloseOverlay(routes.projectTasks(projectId));

  if (!task) {
    return error
      ? <TaskLoadError onRetry={() => void refetch()} />
      : <TaskDetailSkeleton />;
  }

  const projectTasks = fetchedTasks.length > 0 ? fetchedTasks : (state.tasksByProject[projectId] ?? []);
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];

  return (
    <DuplicateTaskDialog
      taskName={task.name}
      hasSubtasks={Boolean(task.parentId || projectTasks.some(t => t.parentId === task.id))}
      hasComments={Boolean(projectComments.some(c => c.taskId === task.id))}
      hasAttachments={Boolean(projectFiles.some(f => f.linkedTaskId === task.id))}
      onCancel={close}
      onConfirm={opts => {
        state.duplicateTaskWithOptions(projectId, task.id, opts);
        close();
      }}
    />
  );
}
