'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter, notFound } from 'next/navigation';
import ProjectTasksPage from '../page';
import { TaskDetailPanel } from '@/features/flowdeck/components/modals';
import { useFlowDeck } from '@/features/flowdeck/store/useFlowDeck';
import { useProjectComments } from '@/features/flowdeck/hooks/useProjectComments';
import { useProjectTasks } from '@/features/flowdeck/hooks/useProjectTasks';
import { getTaskForProject } from '@/features/tasks/selectors/getTaskForProject';
import { routes } from '@/shared/navigation/routes';
import type { ActivityEntry } from '@/features/flowdeck/model';

export default function TaskDetailRoutePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = typeof params.projectId === 'string' ? params.projectId : '';
  const taskId = typeof params.taskId === 'string' ? params.taskId : '';
  const state = useFlowDeck();

  // Fetch real tasks + comments from the API and sync into the store.
  useProjectTasks(projectId);
  useProjectComments(projectId);

  // Fetch real activity from the API (replaces mock store activity).
  const [apiActivity, setApiActivity] = useState<ActivityEntry[]>([]);

  useEffect(() => {
    if (!taskId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/tasks/${taskId}/activity`);
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        setApiActivity((data.activity ?? []).map((a: any) => ({
          id: a.id,
          taskId: a.taskId,
          type: a.type,
          description: a.description,
          authorId: a.authorId ?? '',
          timestamp: a.createdAt,
        })));
      } catch { /* network error */ }
    })();
    return () => { cancelled = true; };
  }, [taskId]);

  const task = getTaskForProject(state.tasksByProject, projectId, taskId);
  if (!task) {
    notFound();
  }

  const projectTasks = state.tasksByProject[projectId] ?? [];
  const projectFiles = state.filesByProject[projectId] ?? [];
  const projectTags = state.tagsByProject[projectId] ?? [];
  const projectComments = state.commentsByProject[projectId] ?? [];
  const projectTimeLogs = state.timeLogsByProject[projectId] ?? [];
  const projectCustomFields = state.customColsByProject[projectId] ?? [];

  const taskComments = projectComments.filter(comment => comment.taskId === taskId);

  // Use API activity if available, fall back to mock store.
  const taskActivity = apiActivity.length > 0
    ? apiActivity
    : (state.activityByProject[projectId] ?? []).filter(a => a.taskId === taskId);

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
      />
    </>
  );
}
