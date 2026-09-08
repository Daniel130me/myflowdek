'use client';

import React from 'react';
import { useRouter, useParams, notFound } from 'next/navigation';
import { CalendarView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectCalendarPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();
  // Hydrate the store on a cold visit (direct URL / cleared storage) —
  // without this the calendar rendered an empty grid on first load.
  useProjectTasks(projectId);

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
      onUpdateTaskDueDate={(taskId, newDate) =>
        // Reschedule writes the field the calendar plots — pills are placed
        // by `dueDate`, so updating `start` here made a dragged pill vanish
        // while silently editing an invisible field.
        state.updateTask(projectId, taskId, { dueDate: newDate })
      }
    />
  );
}
