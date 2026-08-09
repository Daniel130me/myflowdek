/**
 * Centralized API client for task mutations.
 *
 * Each function calls the corresponding backend API endpoint. The caller
 * (the Zustand store) performs the optimistic local update first, then
 * calls these functions to persist to PostgreSQL. On failure, the store
 * can rollback + show an error toast.
 *
 * All functions return a Promise<{ ok: boolean; error?: string }>.
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

/** POST /api/projects/:projectId/tasks — create a task. */
export function apiCreateTask(projectId: string, input: { name: string; status?: string; priority?: string; assigneeId?: string; parentId?: string | null; sectionId?: string | null }) {
  return apiCall(`/api/projects/${projectId}/tasks`, json('POST', input));
}

/** POST /api/projects/:projectId/tasks/bulk — bulk operation. */
export function apiBulkAction(projectId: string, action: string, taskIds: string[], extra?: Record<string, unknown>) {
  return apiCall(`/api/projects/${projectId}/tasks/bulk`, json('POST', { action, taskIds, ...extra }));
}

/* --------------------------- Comment mutations --------------------------- */

/** POST /api/projects/:projectId/comments — add a comment. */
export function apiAddComment(projectId: string, taskId: string, text: string, parentId?: string) {
  return apiCall(`/api/projects/${projectId}/comments`, json('POST', { taskId, text, parentId }));
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
