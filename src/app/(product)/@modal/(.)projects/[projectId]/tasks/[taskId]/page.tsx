'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { TaskDetailPanel } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectTasks(projectId));

  const task = state.tasks.find(t => t.id === taskId);
  if (!task || (task.projectId && task.projectId !== projectId)) {
    return null;
  }

  const tasks = state.tasksByProject[projectId] || state.tasks;
  const parentTask = task.parentId ? tasks.find(t => t.id === task.parentId) : undefined;

  return (
    <TaskDetailPanel
      task={task}
      allTasks={tasks}
      files={state.files}
      tags={state.tags}
      comments={state.taskComments}
      activity={state.taskActivity}
      parentTask={parentTask}
      onClose={close}
      onUpdate={patch => state.updateTask(task.id, patch)}
      onAddSubtask={() => router.push(routes.newTask(projectId))}
      onNavigateToTask={tid => router.push(routes.task(projectId, tid))}
      onToggleTaskTag={state.toggleTaskTag}
      onAddTag={state.addTag}
      onRemoveTag={state.removeTag}
      onAddComment={state.addComment}
      onDeleteComment={state.deleteComment}
      onEditComment={state.editComment}
      onToggleReaction={state.toggleReaction}
      onToggleFollower={state.toggleFollower}
      timeLogs={state.taskTimeLogs}
      onAddTimeLog={state.addTimeLog}
      onDeleteTimeLog={state.deleteTimeLog}
      currentUserId={state.currentUserId}
      customCols={state.customCols}
      onViewFile={fileId => router.push(routes.file(projectId, fileId))}
      onRemoveFile={state.removeFile}
      onAddFiles={state.addFiles}
      onDuplicateTaskWithOptions={state.duplicateTaskWithOptions}
      onMoveToProject={state.moveTaskToProject}
    />
  );
}
