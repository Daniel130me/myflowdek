'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { TaskDetailPanel } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectMembers } from '@/features/flowdeck/components/ui';
import { getTaskForProject } from '@/features/tasks/selectors/getTaskForProject';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';

export default function InterceptedTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();
  const close = useCloseOverlay(routes.projectTasks(projectId));

  const { members } = useProjectMembers(projectId);

  const task = getTaskForProject(state.tasksByProject, projectId, taskId);
  if (!task) {
    notFound();
  }

  const projectTasks = state.tasksByProject[projectId] ?? [];
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectTags = state.tagsByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];
  const projectActivity = state.activityByProject[projectId] ?? [];
  const projectTimeLogs = state.timeLogsByProject[projectId] ?? [];
  const projectCustomFields = state.customColsByProject[projectId] ?? [];

  const taskComments = projectComments.filter(
    comment => comment.taskId === taskId
  );
  const taskActivity = projectActivity.filter(
    activity => activity.taskId === taskId
  );
  const taskTimeLogs = projectTimeLogs.filter(
    log => log.taskId === taskId
  );

  const parentTask = task.parentId ? projectTasks.find(t => t.id === task.parentId) : undefined;

  return (
    <TaskDetailPanel
      task={task}
      allTasks={projectTasks}
      files={projectFiles}
      tags={projectTags}
      comments={taskComments}
      activity={taskActivity}
      parentTask={parentTask}
      onClose={close}
      onUpdate={patch => state.updateTask(projectId, task.id, patch)}
      onAddSubtask={() => router.push(routes.newTask(projectId))}
      onNavigateToTask={tid => router.push(routes.task(projectId, tid))}
      onToggleTaskTag={(taskId, tagId) => state.toggleTaskTag(projectId, taskId, tagId)}
      onAddTag={(tag) => state.addTag(projectId, tag)}
      onRemoveTag={(tagId) => state.removeTag(projectId, tagId)}
      onAddComment={(taskId, text, parentId) => state.addComment(projectId, taskId, text, parentId)}
      onDeleteComment={(commentId) => state.deleteComment(projectId, commentId)}
      onEditComment={(commentId, newText) => state.editComment(projectId, commentId, newText)}
      onToggleReaction={(commentId, emoji) => state.toggleReaction(projectId, commentId, emoji)}
      onToggleFollower={(taskId, userId) => state.toggleFollower(projectId, taskId, userId)}
      timeLogs={taskTimeLogs}
      onAddTimeLog={(taskId, minutes, note) => state.addTimeLog(projectId, taskId, minutes, note)}
      onDeleteTimeLog={(timeLogId) => state.deleteTimeLog(projectId, timeLogId)}
      currentUserId={state.currentUserId}
      customCols={projectCustomFields}
      onViewFile={fileId => router.push(routes.file(projectId, fileId))}
      onRemoveFile={(fileId) => state.removeFile(projectId, fileId)}
      onAddFiles={(files) => state.addFiles(projectId, files)}
      onDuplicateTaskWithOptions={(taskId, opts) => state.duplicateTaskWithOptions(projectId, taskId, opts)}
      onMoveToProject={(taskId, targetProjectId) => state.moveTaskToProject(projectId, taskId, targetProjectId)}
      members={members}
    />
  );
}
