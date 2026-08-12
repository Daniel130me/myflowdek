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

/**
 * POST /api/projects/:projectId/sections — create a section.
 *
 * Returns the server-created section so the store can replace the optimistic
 * temp id with the canonical server id.
 */
export function apiCreateSection(projectId: string, name: string, position?: number) {
  return apiCallWithData<{ section: { id: string; [key: string]: unknown } }>(
    `/api/projects/${projectId}/sections`,
    json('POST', { name, ...(position !== undefined ? { position } : {}) }),
  );
}

/** PATCH /api/projects/:projectId/sections/:sectionId — rename/reorder/collapse. */
export function apiUpdateSection(
  projectId: string,
  sectionId: string,
  patch: { name?: string; position?: number; collapsed?: boolean },
) {
  return apiCall(`/api/projects/${projectId}/sections/${sectionId}`, json('PATCH', patch));
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

/* ------------------------- Project mutations ------------------------- */

/** PATCH /api/projects/:projectId — update project fields (name, description, color, dates). */
export function apiUpdateProject(projectId: string, patch: Record<string, unknown>) {
  return apiCall(`/api/projects/${projectId}`, json('PATCH', patch));
}

/** PATCH /api/projects/:projectId with `{ favorite: true }` — toggles the per-user favourite flag. */
export function apiToggleProjectFavorite(projectId: string) {
  return apiCall(`/api/projects/${projectId}`, json('PATCH', { favorite: true }));
}

/** POST /api/projects/:projectId/archive — soft-delete (archive) a project. */
export function apiArchiveProject(projectId: string) {
  return apiCall(`/api/projects/${projectId}/archive`, { method: 'POST' });
}

/** POST /api/projects/:projectId/restore — restore an archived project. */
export function apiRestoreProject(projectId: string) {
  return apiCall(`/api/projects/${projectId}/restore`, { method: 'POST' });
}

/* ---------------------- Project member mutations --------------------- */

/** GET /api/projects/:projectId/members — list project members. */
export async function apiListProjectMembers(projectId: string) {
  try {
    const res = await fetch(`/api/projects/${projectId}/members`);
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { members: { userId: string; role: string }[] };
    return { ok: true as const, members: data.members };
  } catch {
    return { ok: false as const, error: 'Network error' };
  }
}

/** POST /api/projects/:projectId/members — add a member. */
export function apiAddProjectMember(
  projectId: string,
  userId: string,
  role: string = 'MEMBER',
) {
  return apiCall(`/api/projects/${projectId}/members`, json('POST', { userId, role }));
}

/** DELETE /api/projects/:projectId/members/:userId — remove a member (or leave). */
export function apiRemoveProjectMember(projectId: string, userId: string) {
  return apiCall(`/api/projects/${projectId}/members/${userId}`, { method: 'DELETE' });
}

/* ----------------- Project status update mutations ------------------- */

/** POST /api/projects/:projectId/status-updates — post a status update. */
export function apiCreateProjectStatusUpdate(
  projectId: string,
  input: { text: string; color: 'green' | 'yellow' | 'red' },
) {
  return apiCallWithData<{ update: { id: string; [key: string]: unknown } }>(
    `/api/projects/${projectId}/status-updates`,
    json('POST', input),
  );
}

/** DELETE /api/projects/:projectId/status-updates/:updateId — delete a status update. */
export function apiDeleteProjectStatusUpdate(projectId: string, updateId: string) {
  return apiCall(`/api/projects/${projectId}/status-updates/${updateId}`, { method: 'DELETE' });
}

/* --------------------- Key result mutations -------------------------- */

/** PATCH /api/workspaces/:wid/goals/:goalId/key-results/:krId — update a KR. */
export function apiUpdateKeyResult(
  workspaceId: string,
  goalId: string,
  krId: string,
  patch: Record<string, unknown>,
) {
  return apiCall(
    `/api/workspaces/${workspaceId}/goals/${goalId}/key-results/${krId}`,
    json('PATCH', patch),
  );
}

/** DELETE /api/workspaces/:wid/goals/:goalId/key-results/:krId — delete a KR. */
export function apiDeleteKeyResult(
  workspaceId: string,
  goalId: string,
  krId: string,
) {
  return apiCall(
    `/api/workspaces/${workspaceId}/goals/${goalId}/key-results/${krId}`,
    { method: 'DELETE' },
  );
}

/* ----------------------- Form mutations ------------------------------ */

/** PATCH /api/projects/:projectId/forms/:formId — update form fields/isActive. */
export function apiUpdateForm(projectId: string, formId: string, patch: Record<string, unknown>) {
  return apiCall(`/api/projects/${projectId}/forms/${formId}`, json('PATCH', patch));
}

/** GET /api/projects/:projectId/forms/:formId/submissions — list submissions. */
export async function apiListFormSubmissions(projectId: string, formId: string) {
  try {
    const res = await fetch(`/api/projects/${projectId}/forms/${formId}/submissions`);
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { submissions: unknown[] };
    return { ok: true as const, submissions: data.submissions };
  } catch {
    return { ok: false as const, error: 'Network error' };
  }
}

/* --------------------- Budget mutations ------------------------------ */

/** PATCH /api/projects/:projectId/budgets/:budgetId — update budget fields. */
export function apiUpdateBudget(projectId: string, budgetId: string, patch: Record<string, unknown>) {
  return apiCall(`/api/projects/${projectId}/budgets/${budgetId}`, json('PATCH', patch));
}

/** GET /api/projects/:projectId/budgets/:budgetId — list expenses for a budget. */
export async function apiListExpenses(projectId: string, budgetId: string) {
  try {
    const res = await fetch(`/api/projects/${projectId}/budgets/${budgetId}`);
    if (!res.ok) return { ok: false as const, error: `HTTP ${res.status}` };
    const data = (await res.json()) as { expenses: unknown[] };
    return { ok: true as const, expenses: data.expenses };
  } catch {
    return { ok: false as const, error: 'Network error' };
  }
}

/** DELETE /api/projects/:projectId/budgets/:budgetId/expenses/:expenseId — delete an expense. */
export function apiDeleteExpense(projectId: string, budgetId: string, expenseId: string) {
  return apiCall(
    `/api/projects/${projectId}/budgets/${budgetId}/expenses/${expenseId}`,
    { method: 'DELETE' },
  );
}

/* --------------------- Timesheet mutations --------------------------- */

/** PATCH /api/timesheets/:entryId — update an entry (hours, note, date). */
export function apiUpdateTimesheetEntry(entryId: string, patch: Record<string, unknown>) {
  return apiCall(`/api/timesheets/${entryId}`, json('PATCH', patch));
}

/** DELETE /api/timesheets/:entryId — delete an entry (only if not yet submitted). */
export function apiDeleteTimesheetEntry(entryId: string) {
  return apiCall(`/api/timesheets/${entryId}`, { method: 'DELETE' });
}

/** POST /api/timesheets/submit — submit a batch of entries for approval. */
export function apiSubmitTimesheets(entryIds: string[]) {
  return apiCall('/api/timesheets/submit', json('POST', { entryIds }));
}

/** POST /api/timesheets/approve — approve a batch of submitted entries. */
export function apiApproveTimesheets(entryIds: string[]) {
  return apiCall('/api/timesheets/approve', json('POST', { entryIds }));
}
