'use client';

import React from 'react';
import { SheetView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ProjectSheetPage() {
  const state = useFlowDeck();

  return (
    <SheetView
      tasks={state.filteredTasks}
      onUpdate={(id, patch) => state.updateTask(state.currentProjectId!, id, patch)}
      onAdd={(task) => state.addTask(state.currentProjectId!, task)}
      onRemove={(id) => state.removeTask(state.currentProjectId!, id)}
      grid={state.gridActions}
      onReorder={(taskId, toIndex) => state.reorderTask(state.currentProjectId!, taskId, toIndex)}
      onQuickAdd={name => {
        state.quickAddTask(state.currentProjectId!, name, { status: 'backlog' });
      }}
      onToggleComplete={(id) => state.toggleComplete(state.currentProjectId!, id)}
    />
  );
}
