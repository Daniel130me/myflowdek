'use client';

import React from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import { TaskDetailPanel } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectMembers } from '@/features/flowdeck/components/ui';
import { getTaskForProject } from '@/features/tasks/selectors/getTaskForProject';
import { useCloseOverlay } from '@/shared/navigation/useCloseOverlay';
import { routes } from '@/shared/navigation/routes';
import { useConnectedFileMutations } from '@/features/flowdeck/hooks/useConnectedFileMutations';
import { useProjectFiles } from '@/features/flowdeck/hooks/useProjectFiles';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { useProjectComments } from '@/features/flowdeck/hooks/useProjectComments';
import { TaskDetailSkeleton } from '@/components/ui/skeleton';
import { useTaskActivity } from '@/features/flowdeck/hooks/useAdvancedFeatures';

export default function InterceptedTaskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();
  const fileMutations = useConnectedFileMutations(projectId);
  useProjectFiles(projectId);
  const close = useCloseOverlay(routes.projectTasks(projectId));

  const { members } = useProjectMembers(projectId);

  // A soft navigation can render this intercepted slot before the project
  // task list has hydrated. Fetch only when the requested task is not already
  // cached, avoiding both a false 404 and a duplicate request on warm opens.
  const cachedTask = getTaskForProject(state.tasksByProject, projectId, taskId);
  const { loading: tasksLoading } = useProjectTasks(cachedTask ? null : projectId);
  useProjectComments(projectId);
  const { activity: taskActivity } = useTaskActivity(taskId || null);

  const task = getTaskForProject(state.tasksByProject, projectId, taskId);
  const taskListHydrated = Boolean(state.tasksByProject[projectId]);
  if (!task && !tasksLoading && taskListHydrated) {
    notFound();
  }

  if (!task) {
    return (
      <div style={{ position: 'fixed', inset: 0, zIndex: 70, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={close}
          aria-label="Close task details"
          style={{ position: 'absolute', inset: 0, border: 0, background: 'rgba(31,33,36,0.5)', backdropFilter: 'blur(4px)', cursor: 'pointer' }}
        />
        <div style={{ position: 'relative', width: 'min(650px, 100%)', height: '100%', overflowY: 'auto', background: '#FFFFFF' }}>
          <TaskDetailSkeleton />
        </div>
      </div>
    );
  }

  const projectTasks = state.tasksByProject[projectId] ?? [];
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectTags = state.tagsByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];
  const projectTimeLogs = state.timeLogsByProject[projectId] ?? [];
  const projectCustomFields = state.customColsByProject[projectId] ?? [];

  const taskComments = projectComments.filter(
    comment => comment.taskId === taskId
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
  );
}
