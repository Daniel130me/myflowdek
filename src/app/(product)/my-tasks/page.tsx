'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { MyTasksView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useMyTasks } from '@/features/flowdeck/hooks/useMyTasks';
import { routes } from '@/shared/navigation/routes';
import { TableSkeleton } from '@/components/ui/skeleton';
import { TaskLoadError } from '@/components/ui/task-load-error';

/**
 * My Tasks page.
 *
 * Phase 4 (item 8): the page now fetches the assigned-tasks list from
 * `GET /api/tasks/my` via `useMyTasks`. The view receives the fetched
 * tasks as a prop instead of reading from `state.tasksByProject` with
 * `CURRENT_USER_ID` — the server resolves the current user from the
 * session, so the list is always canonical.
 *
 * Toggle-complete is handled by the hook (optimistic local update +
 * `PATCH /api/tasks/:id` + refetch on failure) so the page doesn't need
 * to mutate the shared project-scoped store just to flip a checkbox.
 */
export default function MyTasksRoutePage() {
  const router = useRouter();
  const state = useFlowDeck();
  const { tasks, loading, error, refetch, toggleComplete } = useMyTasks();

  if (loading && tasks.length === 0) {
    return <TableSkeleton />;
  }

  // A failed fetch used to fall through to the view's "No tasks assigned to
  // you" empty state — indistinguishable from genuinely having no work
  // (audit Table 5.1). Show a retryable error instead.
  if (error && tasks.length === 0) {
    return <TaskLoadError onRetry={() => void refetch()} />;
  }

  return (
    <MyTasksView
      tasks={tasks}
      tagsByProject={state.tagsByProject}
      onOpenTask={(taskId, projectId) => {
        state.openProject(projectId);
        router.push(routes.task(projectId, taskId));
      }}
      onToggleComplete={(taskId) => {
        // Fire-and-forget — the hook handles optimistic update + rollback.
        void toggleComplete(taskId);
      }}
    />
  );
}
