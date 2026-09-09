'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import ProjectTasksPage from '../../page';
import { DuplicateTaskDialog } from '@/features/flowdeck/components/ui';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useTaskForRoute } from '@/features/flowdeck/hooks/useTaskForRoute';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';
import { TaskDetailSkeleton } from '@/components/ui/skeleton';
import { TaskLoadError } from '@/components/ui/task-load-error';

export default function DuplicateTaskRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const taskId = getSingleParam(params.taskId);
  const state = useFlowDeck();

  // Direct URLs / bookmarks start with an empty store, so resolve the task
  // through the fetch-then-404 contract instead of store-only lookup
  // (audit Table 5.1: this page used to notFound() immediately).
  const { task, projectTasks: fetchedTasks, loading, error, refetch, confirmedMiss } =
    useTaskForRoute(projectId ?? '', taskId ?? '');

  if (!projectId || !taskId || confirmedMiss) {
    notFound();
  }

  const close = () => router.push(routes.projectTasks(projectId));

  if (!task) {
    return error
      ? <TaskLoadError onRetry={() => void refetch()} />
      : <TaskDetailSkeleton />;
  }

  // Fetched list wins when present (fresh from the server); store cache as
  // fallback keeps subtask/attachment introspection working after edits.
  const projectTasks = fetchedTasks.length > 0 ? fetchedTasks : (state.tasksByProject[projectId] ?? []);
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];

  return (
    <>
      <ProjectTasksPage />
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
    </>
  );
}
