'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { BoardView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';

export default function ProjectBoardPage() {
  const router = useRouter();
  const state = useFlowDeck();

  return (
    <BoardView
      tasks={state.filteredTasks}
      files={state.files}
      tags={state.tags}
      projects={state.projects}
      currentProjectId={state.currentProjectId}
      allTasks={state.tasks}
      onOpenTask={id => {
        if (state.currentProjectId) {
          router.push(routes.task(state.currentProjectId, id));
        }
      }}
      onMove={(id, status) => state.moveStatus(state.currentProjectId!, id, status)}
      onToggleComplete={(id) => state.toggleComplete(state.currentProjectId!, id)}
      onReorder={(taskId, toIndex) => state.reorderTask(state.currentProjectId!, taskId, toIndex)}
      onQuickAdd={(name, status) => {
        state.quickAddTask(state.currentProjectId!, name, { status });
      }}
      onUpdateTask={(id, patch) => state.updateTask(state.currentProjectId!, id, patch)}
      onRemoveTask={(id) => state.removeTask(state.currentProjectId!, id)}
      onDuplicateTask={id => {
        if (state.currentProjectId) {
          router.push(routes.taskDuplicate(state.currentProjectId, id));
        }
      }}
      onToggleTaskTag={(taskId, tagId) => state.toggleTaskTag(state.currentProjectId!, taskId, tagId)}
      onMoveToProject={state.moveTaskToProject}
      onPromoteSubtask={(id) => state.promoteSubtask(state.currentProjectId!, id)}
      onDemoteToSubtask={(id, parentId) => state.demoteToSubtask(state.currentProjectId!, id, parentId)}
    />
  );
}
