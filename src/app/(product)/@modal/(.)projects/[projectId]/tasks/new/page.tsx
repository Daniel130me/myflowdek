'use client';

import React, { Suspense } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { NewTaskModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectMembers } from '@/features/flowdeck/components/ui';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

/**
 * Intercepted new-task route (soft navigation renders the modal over the
 * current page). Reads the `parent` query param so "Add subtask" lands with
 * the right parent pre-selected (audit Table 5.1) — same contract as the
 * non-intercepted /tasks/new page.
 */
function InterceptedNewTaskInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectTasks(projectId));

  const project = state.projects[projectId];
  const tasks = state.tasksByProject[projectId] || [];
  const tags = state.tagsByProject[projectId] || [];
  const { members } = useProjectMembers(projectId);

  // Only honour the param when the referenced task exists in this project;
  // a stale or hand-edited URL falls back to "None (top-level task)".
  const parentParam = searchParams.get('parent');
  const defaultParentId = parentParam && tasks.some(t => t.id === parentParam) ? parentParam : null;

  return (
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
  );
}

export default function InterceptedNewTaskPage() {
  return (
    <Suspense fallback={null}>
      <InterceptedNewTaskInner />
    </Suspense>
  );
}
