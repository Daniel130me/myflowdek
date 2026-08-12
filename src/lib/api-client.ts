/**
 * Centralized API client for task mutations.
 *
 * Each function calls the corresponding backend API endpoint. The caller
 * (the Zustand store) performs the optimistic local update first, then
 * calls these functions to persist to PostgreSQL. On failure, the store
 * can rollback + show an error toast.
 *
 * Functions that create server-owned records return the parsed JSON body so
 * the store can reconcile the optimistic temp id with the canonical server
 * id. Read-only mutations return `{ ok, error }`.
 */

/** Generic fetch wrapper that returns { ok, error } instead of throwing. */
async function apiCall(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, options);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { ok: false, error: data.error ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

/**
 * Like `apiCall`, but parses + returns the JSON body on success. Used by
 * endpoints that return a newly-created record (e.g. POST /api/projects/:id/tasks)
 * so the store can reconcile optimistic temp ids with server ids.
 */
async function apiCallWithData<T = unknown>(
  url: string,
  options?: RequestInit,
): Promise<{ ok: boolean; error?: string; data?: T }> {
  try {
    const res = await fetch(url, options);
    const data = (await res.json().catch(() => ({}))) as T & { error?: string };
    if (!res.ok) {
      return { ok: false, error: (data as { error?: string }).error ?? `HTTP ${res.status}` };
    }
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Network error' };
  }
}

function json(method: string, body: unknown): RequestInit {
  return {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  };
}

/* ----------------------------- Task mutations ---------------------------- */

/** PATCH /api/tasks/:taskId — update a task's fields. */
export function apiUpdateTask(taskId: string, patch: Record<string, unknown>) {
  return apiCall(`/api/tasks/${taskId}`, json('PATCH', patch));
}

/** DELETE /api/tasks/:taskId — delete a task. */
export function apiDeleteTask(taskId: string) {
  return apiCall(`/api/tasks/${taskId}`, { method: 'DELETE' });
}

/**
 * POST /api/projects/:projectId/tasks — create a task.
 *
 * Returns the server-created task so the store can replace the optimistic
 * temp id with the canonical server id.
 */
export function apiCreateTask(
  projectId: string,
  input: {
    name: string;
    description?: string;
    status?: string;
    priority?: string;
    assigneeId?: string;
    parentId?: string | null;
    sectionId?: string | null;
    dueDate?: string | null;
    startDate?: string | null;
    duration?: number;
  },
) {
  return apiCallWithData<{ task: { id: string; [key: string]: unknown } }>(
    `/api/projects/${projectId}/tasks`,
    json('POST', input),
  );
}

/** POST /api/projects/:projectId/tasks/bulk — bulk operation. */
export function apiBulkAction(projectId: string, action: string, taskIds: string[], extra?: Record<string, unknown>) {
  return apiCall(`/api/projects/${projectId}/tasks/bulk`, json('POST', { action, taskIds, ...extra }));
}

/* -------------------------- Dependency mutations ------------------------- */

/** POST /api/tasks/:taskId/dependencies — add a blocking dependency. */
export function apiAddDependency(taskId: string, dependsOnId: string) {
  return apiCall(`/api/tasks/${taskId}/dependencies`, json('POST', { dependsOnId }));
}

/** DELETE /api/tasks/:taskId/dependencies?dependsOnId=xxx — remove a dep. */
export function apiRemoveDependency(taskId: string, dependsOnId: string) {
  return apiCall(
    `/api/tasks/${taskId}/dependencies?dependsOnId=${encodeURIComponent(dependsOnId)}`,
    { method: 'DELETE' },
  );
}

/* --------------------------- Comment mutations --------------------------- */

/**
 * POST /api/projects/:projectId/comments — add a comment.
 *
 * Returns the server-created comment so the store can reconcile the temp id
 * with the canonical server id (item 55: preserve parentId, editedAt,
 * reactions when mapping the response).
 */
export function apiAddComment(
  projectId: string,
  taskId: string,
  text: string,
  parentId?: string,
) {
  return apiCallWithData<{ comment: { id: string; [key: string]: unknown } }>(
    `/api/projects/${projectId}/comments`,
    json('POST', { taskId, text, parentId }),
  );
}

/** PATCH /api/comments/:commentId — edit a comment. */
export function apiEditComment(commentId: string, text: string) {
  return apiCall(`/api/comments/${commentId}`, json('PATCH', { text }));
}

/** DELETE /api/comments/:commentId — delete a comment. */
export function apiDeleteComment(commentId: string) {
  return apiCall(`/api/comments/${commentId}`, { method: 'DELETE' });
}

/** POST /api/comments/:commentId/reactions — add a reaction. */
export function apiAddReaction(commentId: string, emoji: string) {
  return apiCall(`/api/comments/${commentId}/reactions`, json('POST', { emoji }));
}

/** DELETE /api/comments/:commentId/reactions?emoji=xxx — remove a reaction. */
export function apiRemoveReaction(commentId: string, emoji: string) {
  return apiCall(`/api/comments/${commentId}/reactions?emoji=${encodeURIComponent(emoji)}`, { method: 'DELETE' });
}

/* ----------------------------- Tag mutations ----------------------------- */

/** POST /api/tasks/:taskId/tags — apply a tag. */
export function apiAddTaskTag(taskId: string, tagId: string) {
  return apiCall(`/api/tasks/${taskId}/tags`, json('POST', { tagId }));
}

/** DELETE /api/tasks/:taskId/tags?tagId=xxx — remove a tag. */
export function apiRemoveTaskTag(taskId: string, tagId: string) {
  return apiCall(`/api/tasks/${taskId}/tags?tagId=${tagId}`, { method: 'DELETE' });
}

/* -------------------------- Follower mutations -------------------------- */

/** POST /api/tasks/:taskId/followers — follow a task. */
export function apiFollowTask(taskId: string) {
  return apiCall(`/api/tasks/${taskId}/followers`, { method: 'POST' });
}

/** DELETE /api/tasks/:taskId/followers — unfollow a task. */
export function apiUnfollowTask(taskId: string) {
  return apiCall(`/api/tasks/${taskId}/followers`, { method: 'DELETE' });
}

/* -------------------------- Section mutations -------------------------- */

/** POST /api/projects/:projectId/sections — create a section. */
export function apiCreateSection(projectId: string, name: string) {
  return apiCall(`/api/projects/${projectId}/sections`, json('POST', { name }));
}

/** DELETE /api/projects/:projectId/sections/:sectionId — delete a section. */
export function apiDeleteSection(projectId: string, sectionId: string) {
  return apiCall(`/api/projects/${projectId}/sections/${sectionId}`, { method: 'DELETE' });
}

/* --------------------------- Time-log mutations ------------------------- */

/**
 * POST /api/tasks/:taskId/time-logs — log time on a task.
 *
 * Returns the server-created time-log so the store can reconcile the temp id.
 */
export function apiAddTimeLog(
  taskId: string,
  input: { minutes: number; note?: string; loggedAt?: string },
) {
  return apiCallWithData<{ timeLog: { id: string; [key: string]: unknown } }>(
    `/api/tasks/${taskId}/time-logs`,
    json('POST', input),
  );
}

/** DELETE /api/tasks/:taskId/time-logs/:logId — delete a time-log entry. */
export function apiDeleteTimeLog(taskId: string, logId: string) {
  return apiCall(`/api/tasks/${taskId}/time-logs/${logId}`, { method: 'DELETE' });
}
