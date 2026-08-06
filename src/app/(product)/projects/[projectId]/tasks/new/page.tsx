'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import ProjectTasksPage from '../page';
import { NewTaskModal } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function NewTaskRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  const close = () => router.push(routes.projectTasks(projectId));

  const project = state.projects[projectId];
  const tasks = state.tasksByProject[projectId] || [];
  const tags = state.tagsByProject[projectId] || [];

  return (
    <>
      <ProjectTasksPage />
      <NewTaskModal
        projectStart={project?.start || ''}
        tasks={tasks}
        tags={tags}
        onClose={close}
        onCreate={task => {
          state.addTask({ ...task, projectId });
          close();
        }}
      />
    </>
  );
}
