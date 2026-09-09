'use client';

import React, { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import ProjectTasksPage from '../page';
import { NewTaskModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectMembers } from '@/features/flowdeck/components/ui';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

/**
 * Inner component that reads the `parent` query param (Next 16 requires
 * useSearchParams to sit inside a <Suspense> boundary during prerender).
 *
 * `?parent=<taskId>` threads the parent when arriving via "Add subtask"
 * (audit Table 5.1): previously the button opened the generic new-task
 * modal with "Parent task: None", silently creating an unrelated
 * top-level task unless the user re-selected the parent by hand.
 */
function NewTaskRouteInner() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = () => router.push(routes.projectTasks(projectId));

  const parentParam = searchParams.get('parent');

  const project = state.projects[projectId];
  const tasks = state.tasksByProject[projectId] || [];
  const tags = state.tagsByProject[projectId] || [];
  const { members } = useProjectMembers(projectId);

  // Only honour the param when the referenced task actually exists in this
  // project — a stale or hand-edited URL falls back to "None".
  const defaultParentId = parentParam && tasks.some(t => t.id === parentParam) ? parentParam : null;

  return (
    <>
      <ProjectTasksPage />
      <NewTaskModal
        projectStart={project?.start || ''}
        tasks={tasks}
        tags={tags}
        members={members}
        defaultParentId={defaultParentId}
        onClose={close}
        onCreate={input => {
          state.addTask(projectId, input);
          close();
        }}
      />
    </>
  );
}

export default function NewTaskRoutePage() {
  return (
    <Suspense fallback={null}>
      <NewTaskRouteInner />
    </Suspense>
  );
}
