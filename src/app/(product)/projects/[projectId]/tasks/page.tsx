'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { TaskListView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectTasksPage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <TaskListView
      tasks={state.filteredTasks}
      tags={state.tags}
      projects={state.projects}
      currentProjectId={state.currentProjectId}
      allTasks={state.tasks}
      sections={state.sections}
      onOpenTask={id => {
        if (state.currentProjectId) {
          router.push(routes.task(state.currentProjectId, id));
        }
      }}
      onMove={(id, status) => state.moveStatus(id, status)}
      onToggleComplete={state.toggleComplete}
      onReorder={(taskId, toIndex) => state.reorderTask(taskId, toIndex)}
      onQuickAdd={name => {
        state.quickAddTask(name, { status: 'backlog' });
      }}
      onUpdateTask={state.updateTask}
      onRemoveTask={state.removeTask}
      onDuplicateTask={id => {
        if (state.currentProjectId) {
          router.push(routes.taskDuplicate(state.currentProjectId, id));
        }
      }}
      onToggleTaskTag={state.toggleTaskTag}
      onMoveToProject={state.moveTaskToProject}
      onPromoteSubtask={state.promoteSubtask}
      onDemoteToSubtask={state.demoteToSubtask}
      onAddSection={state.addSection}
      onDeleteSection={state.deleteSection}
    />
  );
}
