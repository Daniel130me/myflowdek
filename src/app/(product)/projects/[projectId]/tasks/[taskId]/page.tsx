'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import ProjectTasksPage from '../page';
import { TaskDetailPanel } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectComments } from '@/features/flowdeck/hooks/useProjectComments';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { useConnectedFileMutations } from '@/features/flowdeck/hooks/useConnectedFileMutations';
import { useProjectFiles } from '@/features/flowdeck/hooks/useProjectFiles';
import { useProjectMembers } from '@/features/flowdeck/components/ui';
import { getTaskForProject } from '@/features/tasks/selectors/getTaskForProject';
import { routes } from '@/shared/navigation/routes';
import { TaskDetailSkeleton } from '@/components/ui/skeleton';
import { TaskLoadError } from '@/components/ui/task-load-error';
import { useTaskActivity } from '@/features/flowdeck/hooks/useAdvancedFeatures';
import { useTaskTimeLogs } from '@/features/flowdeck/hooks/useTaskTimeLogs';

export default function TaskDetailRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();
  const fileMutations = useConnectedFileMutations(projectId);

  // Keep project files in the store so the task modal reflects real uploads and attachments.
  useProjectFiles(projectId);

  // Fetch real tasks + comments from the API and sync into the store.
  const { tasks: fetchedTasks, loading: tasksLoading, error: tasksError, refetch: refetchTasks } = useProjectTasks(projectId);
  useProjectComments(projectId);
  // Real project members for the assignee <select> in the detail panel.
  const { members } = useProjectMembers(projectId);

  const { activity: taskActivity } = useTaskActivity(taskId || null);
  // Hydrate this task's time logs from the server on mount (audit H-09) —
  // previously nothing ever fetched them, so logged work vanished on reload.
  // Called before any early return to keep hook order stable.
  useTaskTimeLogs(projectId ?? null, taskId ?? null);

  const cachedTask = getTaskForProject(state.tasksByProject, projectId, taskId);
  const task = cachedTask ?? fetchedTasks.find(candidate => candidate.id === taskId) ?? null;
  if (!task && !tasksLoading && !tasksError) {
    notFound();
  }

  if (!task) {
    return tasksError
      ? <TaskLoadError onRetry={() => void refetchTasks()} />
      : <TaskDetailSkeleton />;
  }

  const projectTasks = fetchedTasks.length > 0 ? fetchedTasks : (state.tasksByProject[projectId] ?? []);
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectTags = state.tagsByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];
  const projectTimeLogs = state.timeLogsByProject[projectId] ?? [];
  const projectCustomFields = state.customColsByProject[projectId] ?? [];

  const taskComments = projectComments.filter(comment => comment.taskId === taskId);

  // Activity comes exclusively from the API. The previous mock-store fallback
  // (state.activityByProject) is intentionally removed — when the API returns
  // no activity we want to show "No activity recorded yet" instead of fake
  // demo entries that drift out of sync with the server's audit trail.
  const taskTimeLogs = projectTimeLogs.filter(log => log.taskId === taskId);

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
        onUpdate={patch => state.updateTask(projectId, task.id, patch)}
        onAddSubtask={parentTaskId => router.push(routes.newTask(projectId, parentTaskId))}
        onNavigateToTask={tid => router.push(routes.task(projectId, tid))}
        onToggleTaskTag={(taskId, tagId) => state.toggleTaskTag(projectId, taskId, tagId)}
        onAddTag={(tag) => state.addTag(projectId, tag)}
        onRemoveTag={(tagId) => state.removeTag(projectId, tagId)}
        onAddComment={(taskId, text, parentId, fileIds, mentionedUserIds) => state.addComment(projectId, taskId, text, parentId, fileIds, mentionedUserIds)}
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
        onRemoveFile={fileMutations.removeFile}
        onLinkFile={(fileId, linkedTaskId, linked) => state.linkFile(projectId, fileId, linkedTaskId, linked)}
        onFileAttached={() => void fileMutations.refetch()}
        onAddFiles={(files) => fileMutations.uploadFiles(files, taskId)}
        onDuplicateTaskWithOptions={(taskId, opts) => state.duplicateTaskWithOptions(projectId, taskId, opts)}
        onMoveToProject={(taskId, targetProjectId) => state.moveTaskToProject(projectId, taskId, targetProjectId)}
        members={members}
      />
    </>
  );
}
