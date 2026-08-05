'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TimelineView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectTimelinePage() {
  const router = useRouter();
  const state = useFlowDeck();

  if (!state.project) {
    return (
      <div style={{ padding: 32, textAlign: 'center', color: '#6B7280' }}>
        Loading timeline…
      </div>
    );
  }

  return (
    <TimelineView
      project={state.project}
      tasks={state.filteredTasks}
      onOpenTask={id => {
        if (state.currentProjectId) {
          router.push(routes.task(state.currentProjectId, id));
        }
      }}
      onToggleComplete={state.toggleComplete}
      onUpdateTask={state.updateTask}
      grid={state.gridActions}
    />
  );
}
