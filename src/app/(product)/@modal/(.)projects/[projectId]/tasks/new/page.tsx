'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { NewTaskModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectMembers } from '@/features/flowdeck/components/ui';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function InterceptedNewTaskPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectTasks(projectId));

  const project = state.projects[projectId];
  const tasks = state.tasksByProject[projectId] || [];
  const tags = state.tagsByProject[projectId] || [];
  const { members } = useProjectMembers(projectId);

  return (
    <NewTaskModal
      projectStart={project?.start || ''}
      tasks={tasks}
      tags={tags}
      members={members}
      onClose={close}
      onCreate={input => {
        state.addTask(projectId, input);
        close();
      }}
    />
  );
}
