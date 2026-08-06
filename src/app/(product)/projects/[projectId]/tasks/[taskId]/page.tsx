'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import ProjectTasksPage from '../page';
import { TaskDetailPanel } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { getTaskForProject } from '@/features/tasks/selectors/getTaskForProject';
import { routes } from '@/shared/navigation/routes';

export default function TaskDetailRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();

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
    <>
      <ProjectTasksPage />
      <TaskDetailPanel
        task={task}
        allTasks={projectTasks}
        files={projectFiles}
        tags={projectTags}
        comments={taskComments}
        activity={taskActivity}
        parentTask={parentTask}
        onClose={() => router.push(routes.projectTasks(projectId))}
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
        timeLogs={taskTimeLogs}
        onAddTimeLog={state.addTimeLog}
        onDeleteTimeLog={state.deleteTimeLog}
        currentUserId={state.currentUserId}
        customCols={projectCustomFields}
        onViewFile={fileId => router.push(routes.file(projectId, fileId))}
        onRemoveFile={state.removeFile}
        onAddFiles={state.addFiles}
        onDuplicateTaskWithOptions={state.duplicateTaskWithOptions}
        onMoveToProject={state.moveTaskToProject}
      />
    </>
  );
}
