'use client';

import React from 'react';
import { SheetView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';

export default function ProjectSheetPage() {
  const state = useFlowDeck();

  return (
    <SheetView
      tasks={state.filteredTasks}
      onUpdate={state.updateTask}
      onAdd={state.addTask}
      onRemove={state.removeTask}
      grid={state.gridActions}
      onReorder={(taskId, toIndex) => state.reorderTask(taskId, toIndex)}
      onQuickAdd={name => {
        state.quickAddTask(name, { status: 'backlog' });
      }}
      onToggleComplete={state.toggleComplete}
    />
  );
}
