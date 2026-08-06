'use client';

import React, { useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { BoardView } from '@/features/flowdeck/components/views';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { routes } from '@/shared/navigation/routes';
import { getSingleParam } from '@/shared/utils/routeParams';
import { TEAM } from '@/features/flowdeck/model';

export default function ProjectBoardPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = getSingleParam(params.projectId);
  const state = useFlowDeck();

  const projectTasks = useMemo(() => state.tasksByProject[projectId] ?? [], [state.tasksByProject, projectId]);
  const projectFiles = useMemo(() => state.filesByProject[projectId] ?? [], [state.filesByProject, projectId]);
  const tags = useMemo(() => state.tagsByProject[projectId] ?? [], [state.tagsByProject, projectId]);

  const filteredTasks = useMemo(() => {
    let result = projectTasks;
    const { searchQuery, searchFilters } = state;

    /* Text search */
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.name.toLowerCase().includes(q) ||
        (t.description || '').toLowerCase().includes(q) ||
        TEAM.find(m => m.id === t.assignee)?.name.toLowerCase().includes(q)
      );
    }
    /* Structured filters */
    const f = searchFilters;
    if (f.assignees.length) result = result.filter(t => f.assignees.includes(t.assignee));
    if (f.statuses.length) result = result.filter(t => f.statuses.includes(t.status));
    if (f.priorities.length) result = result.filter(t => f.priorities.includes(t.priority));
    if (f.tags.length) result = result.filter(t => (t.tags || []).some(tagId => f.tags.includes(tagId)));
    
    if (f.dueBefore) result = result.filter(t => Boolean(t.dueDate && t.dueDate <= f.dueBefore!));
    if (f.dueAfter) result = result.filter(t => Boolean(t.dueDate && t.dueDate >= f.dueAfter!));
    
    return result;
  }, [projectTasks, state.searchQuery, state.searchFilters]);

  return (
    <BoardView
      tasks={filteredTasks}
      files={projectFiles}
      tags={tags}
      projects={state.projects}
      currentProjectId={projectId}
      allTasks={projectTasks}
      onOpenTask={id => {
        router.push(routes.task(projectId, id));
      }}
      onMove={(id, status) => state.moveStatus(projectId, id, status)}
      onToggleComplete={(id) => state.toggleComplete(projectId, id)}
      onReorder={(taskId, toIndex) => state.reorderTask(projectId, taskId, toIndex)}
      onQuickAdd={(name, status) => {
        state.quickAddTask(projectId, name, { status });
      }}
      onUpdateTask={(id, patch) => state.updateTask(projectId, id, patch)}
      onRemoveTask={(id) => state.removeTask(projectId, id)}
      onDuplicateTask={id => {
        router.push(routes.taskDuplicate(projectId, id));
      }}
      onToggleTaskTag={(taskId, tagId) => state.toggleTaskTag(projectId, taskId, tagId)}
      onMoveToProject={(taskId, targetProjectId) => state.moveTaskToProject(projectId, taskId, targetProjectId)}
      onPromoteSubtask={(id) => state.promoteSubtask(projectId, id)}
      onDemoteToSubtask={(id, parentId) => state.demoteToSubtask(projectId, id, parentId)}
    />
  );
}
