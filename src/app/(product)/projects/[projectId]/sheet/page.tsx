'use client';

import React from 'react';
import { useParams, notFound } from 'next/navigation';
import { SheetView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { getSingleParam } from '@/shared/utils/routeParams';

export default function ProjectSheetPage() {
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  // Fetch real tasks from the API and sync into the store.
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
    <SheetView
      projectId={projectId}
      tasks={filteredTasks}
      onUpdate={(id, patch) => state.updateTask(projectId, id, patch)}
      onAdd={(task) => state.addTask(projectId, task)}
      onRemove={(id) => state.removeTask(projectId, id)}
      grid={state.gridActions}
      onReorder={(taskId, toIndex) => state.reorderTask(projectId, taskId, toIndex)}
      onQuickAdd={name => {
        state.quickAddTask(projectId, name, { status: 'backlog' });
      }}
      onToggleComplete={(id) => state.toggleComplete(projectId, id)}
    />
  );
}
