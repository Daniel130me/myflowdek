'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { CalendarView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectCalendarPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  if (!projectId) {
    notFound();
  }

  const tasks = state.tasksByProject[projectId] ?? [];
  const filteredTasks = tasks.filter(t => 
    t.name.toLowerCase().includes(state.searchQuery.toLowerCase()) ||
    t.description?.toLowerCase().includes(state.searchQuery.toLowerCase())
  );

  return (
    <CalendarView
      tasks={filteredTasks}
      onOpenTask={id => {
        router.push(routes.task(projectId, id));
      }}
      onQuickAdd={(name, start) => {
        state.quickAddTask(projectId, name, { startOverride: start });
      }}
      onUpdateTaskDueDate={(taskId, newDate) => state.updateTask(projectId, taskId, { start: newDate })}
    />
  );
}
