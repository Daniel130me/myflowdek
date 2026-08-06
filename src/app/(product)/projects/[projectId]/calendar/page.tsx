'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { CalendarView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectCalendarPage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <CalendarView
      tasks={state.filteredTasks}
      onOpenTask={id => {
        if (state.currentProjectId) {
          router.push(routes.task(state.currentProjectId, id));
        }
      }}
      onQuickAdd={(name, start) => {
        state.quickAddTask(state.currentProjectId!, name, { startOverride: start });
      }}
      onUpdateTaskDueDate={(taskId, newDate) => state.updateTask(state.currentProjectId!, taskId, { start: newDate })}
    />
  );
}
