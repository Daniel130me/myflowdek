# Flowdeck Production Correction Pass 3 — Worklog

## P8-P9-P10: State + persistence (centralize workspace state, real projects from API, fix direct project navigation, wire task mutations to the API with optimistic updates + rollback)

**Agent:** sub-agent (general-purpose)
**Status:** complete — `bun run lint` (changed files only) and `npx tsc --noEmit` pass. DB-backed tests still require a running PostgreSQL (unchanged from baseline).

### Files added
- `src/providers/WorkspaceProvider.tsx` — React context that fetches `/api/workspaces`, manages `selectedWorkspaceId` (persisted to localStorage under `flowdeck_selected_workspace`), auto-selects the first workspace on first load, and exposes `useWorkspaceContext()` / `useOptionalWorkspaceContext()`.
- `src/app/api/tasks/[taskId]/time-logs/route.ts` — `GET` (list, any project member) + `POST` (create, requires `EDIT_TASK` capability). Validates minutes (1..1440) and optional note/loggedAt.
- `src/app/api/tasks/[taskId]/time-logs/[logId]/route.ts` — `DELETE` (requires `EDIT_TASK` capability, looks up the entry by `logId` and verifies the project capability independently of the URL `taskId`).

### Files modified
- `src/features/flowdeck/hooks/useWorkspaces.ts` — now a thin delegate over `useOptionalWorkspaceContext()`. Old call sites keep working (same return shape, same `WorkspaceSummary` type re-exported). Falls back to empty state outside the provider.
- `src/app/(product)/layout.tsx` — wraps the product shell with `<WorkspaceProvider>` inside `<FlowdekDataProvider>`.
- `src/features/flowdeck/store/useFlowDeck.ts` — added `syncProjects(workspaceId, projects)` and `upsertProject(project)` to the public store interface + implementation. Wired every task/comment/time-log/dependency/follower/reaction mutation to its API with the snapshot → optimistic update → API call → reconcile-server-id-on-success / restore-snapshot-on-failure pattern. Removed browser-side recurrence copy creation in `toggleComplete` (the server's cron handles recurrence). Replaced `undo`/`redo` with a `toast.info('Undo/Redo is not available for persisted task changes')` no-op (history stacks are still maintained by `commit()` so `canUndo`/`canRedo` flags stay accurate for legacy call sites).
- `src/features/flowdeck/hooks/useProjects.ts` — calls `syncProjects(workspaceId, mapped)` after every successful fetch and `upsertProject(mapped)` after a successful create, so the store (sidebar, portfolio, task-detail panels) all see real API data instead of the mock seed.
- `src/app/(product)/projects/[projectId]/layout.tsx` — replaced the `notFound()` on local-state miss with an API fetch via `useProject(projectId)`. The project is upserted into the store once the API responds; `notFound()` is only called on a real API 404/403. While the API is loading and there's no local copy, a "Loading project…" placeholder is shown instead of a 404 — direct navigation from external links now works.
- `src/lib/api-client.ts` — added `apiCallWithData<T>()` helper that returns the parsed JSON body on success. `apiCreateTask`, `apiAddComment`, and `apiAddTimeLog` now return `{ ok, error?, data? }` so the store can reconcile the canonical server id. Added new helpers: `apiAddDependency`, `apiRemoveDependency`, `apiAddTimeLog`, `apiDeleteTimeLog`. Existing helpers (`apiAddReaction`, `apiRemoveReaction`) were already present.
- `src/features/flowdeck/hooks/useComments.ts` — comment thread mapping (item 55). The mapper now preserves `parentId`, derives the `edited` flag from `editedAt`, groups the server's per-user `CommentReaction` rows into the frontend's `{ emoji, userIds[] }` shape, and flattens the nested `replies` tree into a single flat list (each reply keeps its `parentId` so the existing `CommentsSection` — which renders threads from `parentId` lookups — keeps working).

### Phase 9-10 wiring summary (store functions → API)
| Function | Endpoint | Pattern |
| --- | --- | --- |
| `updateTask` | `PATCH /api/tasks/:id` | snapshot + optimistic commit + rollback |
| `toggleComplete` | `PATCH /api/tasks/:id` `{status:'done'\|'in_progress', progress}` | removed browser-side recurrence copy creation; snapshot + rollback |
| `addTask` | `POST /api/projects/:id/tasks` | temp id → server id reconciliation (also rewrites sibling `deps`/`parentId` refs that pointed at the temp id); rollback on failure |
| `quickAddTask` | `POST /api/projects/:id/tasks` | same temp-id reconciliation + rollback |
| `removeTask` | `DELETE /api/tasks/:id` | snapshot (tasks + selection) + rollback |
| `removeTasksBulk` | `POST /api/projects/:id/tasks/bulk` `{action:'delete'}` | unchanged — already wired |
| `addComment` | `POST /api/projects/:id/comments` | temp id → server id reconciliation + rollback |
| `deleteComment` / `editComment` | `DELETE` / `PATCH /api/comments/:id` | snapshot + rollback |
| `toggleReaction` | `POST` / `DELETE /api/comments/:id/reactions` | snapshot reactions + rollback |
| `linkSelected` | `POST /api/tasks/:id/dependencies` (per edge, parallel) | snapshot + rollback on first failure |
| `unlinkSelected` | `DELETE /api/tasks/:id/dependencies?dependsOnId=…` (per edge, parallel) | snapshot + rollback on first failure |
| `promoteSubtask` / `demoteToSubtask` | `PATCH /api/tasks/:id` `{parentId}` | snapshot + rollback |
| `moveTaskToProject` / `moveTasksToProjectBulk` | `POST /api/projects/:id/tasks/bulk` `{action:'move', targetProjectId}` | full snapshot of source + target project's tasks/comments/activity/time-logs/files + selection + selectedTaskId; rollback on failure |
| `duplicateTask` / `duplicateTaskWithOptions` | `POST /api/projects/:id/tasks` (parent then subtasks in parallel with `parentId` set to the server parent id) | temp id → server id reconciliation; snapshot rollback of the parent if the API fails |
| `toggleFollower` | `POST` / `DELETE /api/tasks/:id/followers` | snapshot + rollback |
| `addTimeLog` | `POST /api/tasks/:id/time-logs` | temp id → server id reconciliation (uses the returned `timeLog.id` directly; falls back to a refetch+match if the body is missing the id); rollback on failure |
| `deleteTimeLog` | `DELETE /api/tasks/:id/time-logs/:logId` | snapshot + rollback (re-appends the removed entry) |
| `undo` / `redo` | n/a | replaced with `toast.info('Undo/Redo is not available for persisted task changes')` |

### Verification
- `npx eslint <changed files>` → exit 0
- `npx tsc --noEmit` → exit 0
- `bun run test` → all non-DB-backed tests pass (legacy task migration, FlowdekDataProvider context sharing, capabilities matrix, etc.). DB-backed tests fail because no `DATABASE_URL` is configured in this sandbox — unchanged from baseline.

### Notes for the next agent
- The store's history stacks (`past`/`future`) are still maintained by `commit()` for legacy `canUndo`/`canRedo` consumers (e.g. the `GridToolbar` undo/redo buttons). The buttons will appear enabled but clicking them surfaces the info toast — if a future phase wants to hide the buttons entirely, gate them on a static `false` instead of `past.length > 0`.
- The recurrence cron route is at `/api/cron/recurrence/route.ts`. After removing the browser-side recurrence copy in `toggleComplete`, recurring tasks now rely on the cron being invoked periodically (Vercel/Render cron, or a manual trigger). If the cron isn't set up, completing a recurring task will mark it done but won't create the next occurrence until the cron runs.
- The `useComments` mapper flattens nested replies into a flat list with `parentId` links. If a future phase wants the UI to render replies indented under their parent, it can group by `parentId` client-side; the data is already there.
- Direct project navigation now relies on `useProject(projectId)` (single GET `/api/projects/:id`). For very fast back-to-back navigations the `upsertProject` effect can race with the route's own refetch — both converge on the same canonical project, so the end state is correct, but a loading spinner may flash briefly.
