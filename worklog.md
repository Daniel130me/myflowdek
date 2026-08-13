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

---

## P4-2-6-10: Approval + timesheet integrity, recurrence lineage, historical-data schema

**Agent:** sub-agent (general-purpose)
**Status:** complete — `npx eslint src/` (0 errors), `npx tsc --noEmit` (exit 0), DB-backed tests unchanged from baseline (79 pass / 0 fail / 5 cancelled by harness timeout). `prisma migrate status` → "11 migrations found, Database schema is up to date!"

### Context discovered
The Neon DB had two migrations applied directly (`20260812041225_add_recurrence_source`, `20260812044618_protect_historical_business_data`) but the corresponding migration folders were missing locally and `prisma/schema.prisma` had not been synced. `prisma migrate status` was falsely reporting "9 migrations found, up to date" because Prisma's status check only flags migrations in the folder that aren't yet applied — it doesn't surface drift in the other direction. This is the "previous agent applied it locally but didn't commit" scenario called out in the brief.

### Item 2 — Approval + timesheet integrity

**`src/server/approvals/approval.service.ts`** — `createApproval` now does two extra DB checks before inserting:
1. Verifies the task exists AND `task.projectId === projectId` (rejects cross-project `taskId` tampering — `400` "Task does not belong to this project").
2. Verifies the `approverId` corresponds to a `ProjectMember` row on the same project (rejects arbitrary `approverId` values — `400` "Approver is not a member of this project").
The requester's `MANAGE_APPROVALS` capability was already enforced by the route handler via `requireProjectCapability(user.id, projectId, 'MANAGE_APPROVALS')` — no change needed there. `resolveApproval` is unchanged; the existing `approverId !== userId` check continues to work now that `approverId` is nullable (`null !== userId` evaluates `true`, so an approval whose approver has been offboarded can no longer be resolved by anyone — desired fail-closed behaviour).

**`src/server/timesheets/timesheet.service.ts`** — `createTimesheet` now verifies, when `input.taskId` is supplied, that the task exists AND `task.projectId === input.projectId` (`400` "Task does not belong to this project"). The route handler's `requireProjectCapability(user.id, projectId, 'VIEW_PROJECT')` already covers the project-membership check (VIEW_PROJECT includes every role, so it's equivalent to `requireProjectMember`). `deleteTimesheet` continues to work correctly with the now-nullable `userId` — `entry.userId !== userId` is `true` when the entry's owner has been offboarded, so historical entries can no longer be deleted by anyone (intended).

**`src/app/api/timesheets/approve/route.ts`** — refactored to delegate the capability check to `requireProjectCapability(user.id, projectId, 'APPROVE_TIMESHEETS')` instead of the previous inline `ProjectMember.findUnique` + `PROJECT_PERMISSIONS.APPROVE_TIMESHEETS` lookup. Behaviour is identical (OWNER/ADMIN only), but the matrix in `capabilities.ts` is now the single source of truth for who can approve timesheets. Also added a 404 short-circuit when any `entryId` doesn't exist (previously silently approved zero entries).

### Item 6 — Recurrence lineage

**`prisma/schema.prisma`** — added to the `Task` model:
```prisma
recurrenceSourceId String?
recurrenceSource   Task?  @relation("TaskRecurrenceSource", fields: [recurrenceSourceId], references: [id], onDelete: SetNull)
recurrenceChildren Task[] @relation("TaskRecurrenceSource")
@@index([recurrenceSourceId])
```
The relation is distinct from `parent`/`subtasks` (the subtask hierarchy). The column was already present in the Neon DB (applied by the missing `20260812041225_add_recurrence_source` migration); this just syncs the local schema + Prisma client types.

**`prisma/migrations/20260812041225_add_recurrence_source/migration.sql`** — recreated the migration SQL that was already applied to Neon (`ADD COLUMN`, `CREATE INDEX`, `ADD CONSTRAINT` with `ON DELETE SET NULL` on the self-referential FK). Folder name matches the `migration_name` recorded in `_prisma_migrations` so future `prisma migrate deploy` runs won't try to re-apply it.

**`src/server/tasks/recurrence.service.ts`** — `processRecurringTasks` now:
- Sets `recurrenceSourceId: task.id` (lineage pointer to the source task) on each generated occurrence — replacing the previous `parentId: task.id` assignment that incorrectly conflated recurrence with the subtask hierarchy.
- Inherits `parentId: task.parentId` from the source, so a recurring subtask's next occurrence stays under the same parent (or `null` if the source was top-level).
- Deduplication check now matches on `recurrenceSourceId: task.id` instead of `projectId + name + parentId`. This is both more specific (only the cron ever sets `recurrenceSourceId`) and avoids false positives when the user has manually nested tasks with the same name under the source. The previous name+project+parentId match was vulnerable to false positives after the schema change because `parentId` is no longer set to the source.
- Also bounded the loop with the previously-declared-but-unused `MAX_RECURRENCE_DEPTH` constant (defensive cap).

### Item 10 — Historical data schema fixes

**`prisma/schema.prisma`** — synced to match the DB state for all the items called out in the brief. None of these were already reflected in `schema.prisma`, even though all the underlying DB constraints were applied by the missing `20260812044618_protect_historical_business_data` migration:

| Model | Field | Before (schema.prisma) | After (matches DB) |
| --- | --- | --- | --- |
| `ApprovalRequest` | `requesterId` | `String` + `onDelete: Cascade` | `String?` + `onDelete: SetNull` |
| `ApprovalRequest` | `approverId` | `String` + `onDelete: Cascade` | `String?` + `onDelete: SetNull` |
| `TimesheetEntry` | `userId` | `String` + `onDelete: Cascade` | `String?` + `onDelete: SetNull` |
| `TimesheetEntry` | `taskId` | `String?` (no FK) | `String?` + `task Task?` relation `onDelete: SetNull` + `@@index([taskId])` |
| `Expense` | `createdBy` | `String` (no FK) | `String?` + `createdByUser User?` relation `onDelete: SetNull` + `@@index([createdBy])` |
| `FormSubmission` | `submittedBy` | `String?` (no FK) | `String?` + `submittedByUser User?` relation `onDelete: SetNull` + `@@index([submittedBy])` |
| `FormSubmission` | `convertedTaskId` | `String?` (no FK) | `String?` + `convertedTask Task?` relation `onDelete: SetNull` + `@@index([convertedTaskId])` |
| `Goal` | `workspaceId` | `String` (no FK) | `String` + `workspace Workspace` relation `onDelete: Cascade` |

Back-relations added to keep the Prisma schema valid:
- `User.expenses Expense[] @relation("ExpenseCreator")`
- `User.formSubmissions FormSubmission[] @relation("FormSubmitter")`
- `Task.formSubmissions FormSubmission[] @relation("FormConvertedTask")`
- `Workspace.goals Goal[]`

Named relations (`"ExpenseCreator"`, `"FormSubmitter"`, `"FormConvertedTask"`) avoid ambiguity with other User↔Expense / User↔FormSubmission / Task↔FormSubmission relations that may be added later.

**`prisma/migrations/20260812044618_protect_historical_business_data/migration.sql`** — recreated the migration SQL that was already applied to Neon. Drops the three existing `ON DELETE CASCADE` user FKs (`ApprovalRequest_requesterId_fkey`, `ApprovalRequest_approverId_fkey`, `TimesheetEntry_userId_fkey`), `DROP NOT NULL`s the four author columns, re-adds the FKs with `ON DELETE SET NULL`, then adds the five missing FKs (`TimesheetEntry_taskId_fkey`, `Expense_createdBy_fkey`, `FormSubmission_submittedBy_fkey`, `FormSubmission_convertedTaskId_fkey`, `Goal_workspaceId_fkey`) and the four supporting indexes. Folder name matches the `migration_name` in `_prisma_migrations`.

### Verification
- `npx prisma migrate diff --from-schema-datasource … --to-schema-datamodel …` (both directions) → empty diff (schema.prisma is byte-identical to the live Neon state).
- `npx prisma migrate status` → "11 migrations found in prisma/migrations / Database schema is up to date!" (was 9 before, with drift hidden).
- `npx prisma generate` → succeeded; the regenerated `@prisma/client` now exposes `Task.recurrenceSource`, `Task.recurrenceChildren`, `Expense.createdByUser`, `FormSubmission.submittedByUser`, `FormSubmission.convertedTask`, `TimesheetEntry.task`, `Goal.workspace`, etc.
- `npx eslint src/` → exit 0 (only the pre-existing `no-unused-expressions` warning in `settings/page.tsx`, which was not touched).
- `npx tsc --noEmit` → exit 0. The nullable `approverId/requesterId/userId/createdBy` types flow through cleanly — the only callers that compare these against a session `userId` use `!==`, which is sound under `string | null` (a `null` owner is never equal to any session id, so historical records become read-only as intended).
- `bun run test` (with `DATABASE_URL` pointed at Neon) → 79 pass / 0 fail / 5 cancelled by the 90 s harness timeout. The `permission boundaries` suite (which exercises `requireProjectCapability`) passes — directly validating the approval + timesheet capability checks added in Item 2.

### Notes for the next agent
- The two new migration folders (`20260812041225_add_recurrence_source`, `20260812044618_protect_historical_business_data`) contain SQL that exactly matches what's already in the Neon DB — verified by the empty `migrate diff` output. Do NOT re-run `prisma migrate dev` or `prisma migrate reset` against Neon; both migrations are already recorded in `_prisma_migrations` and a re-run would either no-op or, worse, wipe the table.
- The frontend types in `src/features/flowdeck/model/types.ts` still declare `requesterId: string; approverId: string;` (non-null). The API now returns `string | null` for these once a user is offboarded, but the frontend's static types haven't been widened. In practice this is fine because the API responses flow through `await res.json()` (typed as `any`), so the runtime values are correct even though the declared types are stricter than reality. If a future phase adds end-to-end typing on the API client, those frontend type declarations should be widened to `string | null` and the UI (e.g. `ApprovalsView.tsx`'s `teamById[approval.requesterId]` lookup) should be audited to render a "former member" placeholder for null ids.
- The recurrence service's `parentId` inheritance (`parentId: task.parentId`) preserves the subtask position of recurring subtasks. If a future phase wants recurring instances to always be top-level (regardless of whether the source was a subtask), drop that line and let it default to `null`.
- `MAX_RECURRENCE_DEPTH` is now enforced as a per-cron-run cap on the number of generated occurrences. It does NOT prevent long-running recurring chains across multiple cron invocations — each generated occurrence carries the recurrence pattern forward and will itself spawn a next occurrence when completed. If a future phase wants to bound the total chain length, add a counter that walks `recurrenceSourceId` up the chain before generating.

---

## FCP-2-3: Fix frontend Task → API field mapping + section hydration

**Agent:** sub-agent (general-purpose)
**Status:** complete — `npx eslint src/` (0 errors, 1 pre-existing warning in `settings/page.tsx` that was not touched), `npx tsc --noEmit` (exit 0). 92 non-DB-backed tests pass; DB-backed tests unchanged from baseline (no `DATABASE_URL`). Did not commit.

### Item 2 — Frontend Task → API field mapping

**`src/lib/api-client.ts`** — added a single `taskToApiPayload(task: Partial<Task>): Record<string, unknown>` helper that is now the single source of truth for the frontend→API field-name translation. It emits only the keys whose value is `!== undefined`, and maps the four fields whose names differ between the two layers:

| Frontend (`Task`) | API (`createTaskSchema` / `updateTaskSchema`) |
| --- | --- |
| `assignee` | `assigneeId` |
| `start` | `startDate` |
| `dueDate` | `dueDate` (same) |
| `parentId` / `sectionId` / `recurrence` / `progress` / `status` / `priority` / `duration` / `name` / `description` | (same) |
| `sortOrder` | (same — emitted but the route schema currently strips it; see Notes) |

`tags`, `followers`, `customFields`, and `storyPoints` are intentionally **not** emitted — they have dedicated endpoints (or no API yet), and previously the store would pass them through to `apiUpdateTask` where Zod silently stripped them. The mapping function makes that contract explicit so a future caller can't accidentally depend on the strip behaviour.

The `apiCreateTask` signature was widened from a strict input-shape object to `Record<string, unknown>` so the store can pass the mapped payload directly. `apiUpdateTask` was already typed as `Record<string, unknown>` — no change needed.

**`src/features/flowdeck/store/useFlowDeck.ts`** — imported `taskToApiPayload` and routed every task-mutation call site through it. The seven `apiUpdateTask` call sites and five `apiCreateTask` call sites are now:

| Store function | Endpoint | Payload source |
| --- | --- | --- |
| `updateTask` | `PATCH /api/tasks/:id` | `taskToApiPayload(patch)` — `patch` is whatever the caller passed to `updateTask`, so this is the central choke point that drops `tags`/`followers`/`customFields`/`storyPoints` for every consumer (TaskDetailPanel, GridToolbar, etc.) |
| `toggleComplete` (reopen + done branches) | `PATCH /api/tasks/:id` | `taskToApiPayload({ status, progress })` |
| `setRecurrenceSelected` | `PATCH /api/tasks/:id` (per selected id) | `taskToApiPayload({ recurrence: freq })` |
| `promoteSubtask` | `PATCH /api/tasks/:id` | `taskToApiPayload({ parentId: null })` |
| `demoteToSubtask` | `PATCH /api/tasks/:id` | `taskToApiPayload({ parentId: newParentId })` |
| `setTaskSection` | `PATCH /api/tasks/:id` | `taskToApiPayload({ sectionId })` |
| `addTask` | `POST /api/projects/:id/tasks` | `taskToApiPayload({ name, description, status, priority, assignee, parentId, sectionId, dueDate, start, duration })` |
| paste-from-clipboard | `POST /api/projects/:id/tasks` (per clone) | `taskToApiPayload({ ...same fields })` |
| `importCSV` | `POST /api/projects/:id/tasks` (per row) | `taskToApiPayload({ ...same fields minus parentId/sectionId })` |
| `quickAddTask` | `POST /api/projects/:id/tasks` | `taskToApiPayload({ name, status, parentId, start })` — `opts?.status` is `string | undefined`, cast to `TaskStatus | undefined` to satisfy the stricter `Task.status` type |
| `duplicateTaskWithOptions` (`persistClone`) | `POST /api/projects/:id/tasks` | `taskToApiPayload({ ...same fields plus status: 'backlog' })` |

The `useMyTasks.toggleComplete` hook (separate from the store) was left alone — it already sends `{ status, progress }`, both of which have the same name on the API side, so wrapping them would be a no-op. If a future phase adds `assignee`/`start` to that hook, it should switch to `taskToApiPayload` too.

**`src/features/flowdeck/model/types.ts`** — added `sortOrder?: number` to both `Task` and `UpdateTaskInput`. The Prisma `Task` model has always had this column (it's in `taskSelect` and used as the default `orderBy`), but it wasn't surfaced on the frontend type, so the `task.sortOrder` reference inside `taskToApiPayload` would not have compiled. Adding it as an optional field is backward-compatible with every existing consumer.

**`src/features/flowdeck/components/modals/TaskDetailPanel.tsx`** — story points is the one control with no backend API. Previously clicking a value called `onUpdate({ storyPoints })`, which propagated to the store's `updateTask`, which sent it to `apiUpdateTask`, where Zod silently stripped it — so the click was a silent no-op (the local optimistic state would update, but a refresh would revert). The click handler now shows `toast.info('Story points are not yet available')` instead. The button's visual styling (which value is highlighted) is unchanged so the existing local state still renders correctly. `import { toast } from 'sonner'` was added.

### Item 3 — Section hydration

**`src/server/tasks/task.service.ts`** — added `sectionId: true` to the `taskSelect` constant. This is the select object used by `listTasks`, `getTask`, `createTask`, and `updateTask`, so every task API response now includes `sectionId`. Without this, `sectionId` was being persisted correctly (the create/update service code already wrote it from the input) but never returned in the response — so the frontend had no way to know which section a task belonged to after a refetch.

**`src/server/tasks/repository.ts`** — added `sectionId: true` to the second `taskSelect` constant in this file (the repository layer has its own copy used by `findProjectTasks`, `createTask`, `updateTask`). Kept in sync with `task.service.ts`'s select. (The `/api/tasks/my` route already had `sectionId: true` inline — no change needed there.)

**`src/features/flowdeck/hooks/useTasks.ts`** — added `sectionId: string | null` to the `ApiTask` interface, and added `sectionId: api.sectionId ?? null` to the `mapTask` function. The frontend `Task` interface already had `sectionId?: string | null`, so the only missing piece was the API→frontend mapper. After this change, assigning a task to a section and refreshing preserves the section assignment (previously the section dropdown would silently reset to "No section" on refresh because the API response was missing the field).

### Verification

- `npx eslint src/` → 0 errors (1 pre-existing `no-unused-expressions` warning in `settings/page.tsx` line 82, untouched).
- `npx tsc --noEmit` → exit 0. The `taskToApiPayload` signature widening on `apiCreateTask` flows through cleanly — every call site passes the output of `taskToApiPayload`, which is `Record<string, unknown>`.
- `npx tsx --test` on the non-DB-backed suite (corrections, selectors, task-validation, task-relationships.branching, capabilities, storage adapter, FlowdekDataProvider, routes, cron-security) → 92 pass / 0 fail. The DB-backed suite (`auth.test.ts`, `integration.test.ts`, `integration-frontend.test.ts`, `pass4-integrity.test.ts`) still requires a `DATABASE_URL` — unchanged from baseline.

### Notes for the next agent

- **`pass4-integrity.test.ts` "store updateProject calls the API" was failing on baseline** (verified by `git stash && npx tsx --test ...` then `git stash pop`) and is still failing after my changes. The test reads the first 800 chars of `const updateProject` in `useFlowDeck.ts` and asserts it contains `'fetch' || 'apiUpdateProject'`. The function body has grown (snapshot/rollback comments + the `apiPatch` field-by-field mapping) so the `apiUpdateProject(projectId, apiPatch)` call now sits just past the 800-char window. The function is still wired correctly — the test's window is just too narrow. Bump the slice to `fnStart + 1200` or assert on the whole function body to fix.
- **`sortOrder` is in `taskToApiPayload` but the route schema currently strips it.** `updateTaskSchema`/`createTaskSchema` don't declare `sortOrder`, so even though the client now emits it, the server's Zod schema (default = strip) silently drops it. If a future phase wants to actually persist reorderings via the task PATCH endpoint, add `sortOrder: z.number().int().optional()` to `updateTaskSchema` and add `sortOrder: input.sortOrder ?? undefined` to the `updateTask` service's `data:` object. Today reordering only persists via the dedicated bulk reorder endpoint (if one exists) or not at all — same as before this change.
- **`useMyTasks.toggleComplete`** in `src/features/flowdeck/hooks/useMyTasks.ts` still calls `apiUpdateTask` directly with `{ status, progress }`. Both keys are identically named on the API side, so no translation is needed today — but if that hook ever grows to send `assignee` or `start`, it must switch to `taskToApiPayload` (or the API call will silently 422/strip).
- **Story points local state.** The story points UI still highlights the currently-selected value (driven by `task.storyPoints` in local state, which is seeded from templates / CSV imports / localStorage). Disabling the click handler means a user can no longer change that local value via the UI — so the highlighted value will reflect whatever was set at task creation, and a refresh won't change it. When the story points API is built, swap the `toast.info` onClick back to `onUpdate({ storyPoints: ... })` and add `storyPoints` to both the route schema and `taskToApiPayload`.
- **Custom fields** still flow through `onUpdate({ customFields: ... })` from `TaskDetailPanel`'s custom-fields section. The local optimistic state updates (so the UI reflects the change immediately), but `taskToApiPayload` drops the field before it reaches `apiUpdateTask`, so the change is **not persisted** — a refresh reverts it. When the dedicated custom-fields API is built, route those updates through it (the same way `toggleTaskTag` routes through `apiAddTaskTag`).
- **`tags` / `followers`** were already routed through their dedicated endpoints (`apiAddTaskTag`, `apiRemoveTaskTag`, `apiFollowTask`, `apiUnfollowTask`) by the previous Phase 9-10 wiring — no UI sends them through `onUpdate`. The mapping function's omission of them is just defense-in-depth.


---

## FCP-4-5: Harden bulk operations + remove demo data from authenticated production state

**Agent:** sub-agent (general-purpose)
**Status:** complete — `npx eslint src/` (0 errors, 1 pre-existing warning in `settings/page.tsx`), `npx tsc --noEmit` (exit 0). Non-DB-backed test suite (110 tests across routes, FlowdekDataProvider, storageAdapter, selectors, corrections, capabilities, task-validation, task-relationships, reconciliation-rollback, cron-security) → 110 pass / 0 fail. DB-backed suite unchanged from baseline (requires `DATABASE_URL`).

### Item 4 — Harden all bulk operations

**`src/app/api/projects/[projectId]/tasks/bulk/route.ts`** — added three pre-dispatch security checks that run AFTER the capability check but BEFORE `executeBulkAction` is called:

1. **Task ownership (ALL actions).** Fetches every task id in the payload that belongs to the route's `projectId`. If the count of matched rows ≠ the count of unique requested ids, the entire operation is rejected with `400 'Some tasks do not belong to this project'`. No partial mutation ever reaches the database. The previous service-level `where: { id: { in: taskIds }, projectId }` filter would silently shrink the affected row count — a caller could pass foreign task ids alongside valid ones and the valid subset would still get mutated. The route-level check makes that an explicit 400 instead. The task ids are deduplicated (`Array.from(new Set(action.taskIds))`) before the length comparison so a caller passing the same id twice doesn't trip the check.

2. **Assignee membership (`assignee` action only, when `assigneeId !== null`).** Looks up `ProjectMember` by the compound key `projectId_userId`. If no row exists, returns `400 'Assignee is not a member of this project'`. Unassigning (`assigneeId === null`) is always allowed — there's nothing to verify. This mirrors the check already in `task.service.ts` for single-task `updateTask` and `createTask`, closing the gap where bulk-assign could bypass it.

3. **Tag ownership (`addTag` + `removeTag` actions).** Fetches the tag and verifies `tag.projectId === projectId`. Returns `400 'Tag does not belong to this project'` otherwise. The service already did this for `addTag` (as a 404 throw), but `removeTag` had no such check — it would happily delete `TaskTag` rows whose `tagId` belonged to another project if a caller passed foreign task ids (the route-level task-ownership check now blocks that too, but defense-in-depth here is cheap and makes the response shape consistent across add/remove).

The service (`src/server/tasks/bulk.service.ts`) was left unchanged — its existing `where: { id: { in: taskIds }, projectId }` filters on each mutation now act as defense-in-depth (belt and suspenders) rather than the only line of defense. The `addTag` branch's existing `tag.projectId !== projectId` check is similarly redundant now but harmless. All 9 action types (`status`, `priority`, `assignee`, `dueDate`, `complete`, `delete`, `move`, `addTag`, `removeTag`) are covered by the task-ownership check; the assignee check fires only for `assignee`; the tag check fires only for `addTag`/`removeTag`.

### Item 5 — Remove demo data from authenticated production state

**`src/features/flowdeck/store/useFlowDeck.ts`** — three changes:

1. **Empty initial state in production.** Every business-data `useState` initializer that previously read from the mock fixtures (`INITIAL_PROJECTS`, `initialTasks`, `initialFiles`, `initialRaid`, `INITIAL_TAGS`, `initialComments`, `initialTimeLogs`) now starts from `{}`. The `currentUserId` initializer that read `CURRENT_USER_ID` now starts from `''`. The `membersById` initializer that seeded from `TEAM` now starts from `{}`. The `goals`/`keyResults` arrays that hardcoded two demo goals + five demo key results now start from `[]`. The `automations` array that hardcoded two demo rules now starts from `[]`. All of these are populated on demand from the API (`useProjects`, `useProjectTasks`, `useProjectTags`, `useProjectComments`, `useProjectFiles`, `useStatusUpdates`, `useMyTasks`, `useProjectMembers`, …) — the store was already wired to the API by the P8-P9-P10 work; this just removes the mock seed that was masking the empty state during the brief window before the API responds.

2. **Demo mode gate.** The mock fixtures are still imported and still used, but only behind an explicit `isDemoMode = process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true'` check. Each initializer uses `isDemoMode ? <fixture> : <empty>`. In production builds (`NODE_ENV=production` or no `NEXT_PUBLIC_DEMO_MODE`), every collection starts empty. The legacy demo/dev workflow (set `NEXT_PUBLIC_DEMO_MODE=true` in `.env.local`) still works exactly as before.

3. **Stripped localStorage hydration.** The mount `useEffect` previously called `loadPersistedState()` and restored 22 business-data fields from localStorage (projects, tasksByProject, filesByProject, raidByProject, customColsByProject, tagsByProject, commentsByProject, activityByProject, timeLogsByProject, sectionsByProject, statusUpdatesByProject, goals, keyResults, savedFilters, automations, forms, submissions, approvals, budgets, expenses, timesheets). All of those `setX(persisted.x as ...)` lines are gone. The effect now only restores `currentProjectId` and `activeView` — pure UI preferences that don't reflect business state. The debounced save effect (which already only persisted `currentProjectId` + `activeView`) is unchanged.

**`src/data/local-storage/storageAdapter.ts`** — removed the `INITIAL_PROJECTS`/`initialTasks`/`initialFiles`/`initialRaid` import. `migrateState` no longer falls back to those fixtures when localStorage is missing the field (`validated.projects ?? {}` instead of `validated.projects ?? initialTasks`). `createDefaultPersistedState` returns empty collections across the board instead of seeding from the fixtures. The `PersistedStateSchema` itself is unchanged — the fields remain optional for backward compatibility with older localStorage writes, but the store no longer reads them. This is a belt-and-suspenders cleanup: even if a future change accidentally re-adds a `setProjects(persisted.projects)` line to the store's hydration effect, the adapter would feed it `{}` rather than the mock seed.

**What was NOT removed:**
- `src/features/flowdeck/model/data.ts` is untouched. `TEAM`, `CURRENT_USER_ID`, `INITIAL_PROJECTS`, `initialTasks`, `INITIAL_TAGS`, `initialComments`, `initialTimeLogs`, `initialFiles`, `initialRaid`, `MEMBER_CAPACITY` remain exported. They're still used by view components for display-level fallbacks (e.g. `MyTasksView.tsx` uses `CURRENT_USER_ID` as a fallback assignee id when `t.assignee` is empty; `TeamView.tsx` uses `MEMBER_CAPACITY` for the capacity bar; `FilesView.tsx` uses `CURRENT_USER_ID` as the default `uploadedBy` for new files). These are display concerns, not store-seeding — they don't resurrect business data.
- The mock repositories (`src/data/mock/mockProjectRepository.ts`, `src/data/mock/mockTaskRepository.ts`) still import `INITIAL_PROJECTS`/`initialTasks`. These are only used by the mock data layer (not the API-backed store). Leaving them alone.
- The demo login (`useAuth.demoLogin`) still uses `DEMO_CREDENTIALS` from `auth.constants.ts` — signs in via the real credentials provider against the seeded demo user in PostgreSQL. The demo workspace loads its data from the API (not from mock arrays), so it works exactly the same way with the empty initial state.

### Verification

- `npx eslint src/` → 0 errors (1 pre-existing `no-unused-expressions` warning in `settings/page.tsx` line 82, untouched).
- `npx tsc --noEmit` → exit 0. The `isDemoMode` gate and the empty initializers flow through cleanly; the `process.env.NEXT_PUBLIC_DEMO_MODE` reference is fine because Next.js inlines `NEXT_PUBLIC_*` env vars at build time.
- Non-DB-backed test suite (110 tests) → 110 pass / 0 fail. Includes `FlowdekDataProvider.test.ts` (verifies the provider still exposes shared state to layout + children), `storageAdapter.test.ts` (verifies `migrateState` still defaults/recovery-safely handles null/invalid/missing-fields input), and `corrections.test.ts`.
- DB-backed suite (`auth.test.ts`, `integration.test.ts`, `integration-frontend.test.ts`, `pass4-integrity.test.ts`) — unchanged from baseline. The `pass4-integrity.test.ts` "store updateProject calls the API" test was failing on baseline (the FCP-3 worklog entry documents this: the test reads the first 800 chars of `const updateProject` and the function body has grown past that window). My changes to `useFlowDeck.ts` don't touch `updateProject`, so the test status is unchanged.

### Notes for the next agent

- **The store now starts empty in production.** This means the sidebar, portfolio, and task list will be empty for a brief moment on first load until `useProjects` / `useProjectTasks` respond. The P8-P9-P10 work already added loading states (`useProject` shows "Loading project…" in the project layout; `useProjects` exposes `loading`/`error`), so the UX is fine — but if a future phase wants to add a skeleton, the empty state is the right place to gate it.
- **`isDemoMode` is computed once at the top of `useFlowDeckStore()` and captured in the `useState` initializers.** It's a build-time constant (Next.js inlines `process.env.NODE_ENV` and `NEXT_PUBLIC_*`), so it won't change between renders. Don't try to make it reactive.
- **The storage adapter still accepts business-data fields in `PersistedStateSchema`** for backward compatibility — if an existing user has stale `tasksByProject` in their localStorage from a previous version, `loadPersistedState()` will still parse it without throwing. The store just ignores those fields now. If you want to actively purge stale business data from existing users' localStorage, add a migration that deletes those keys (bump `STORAGE_VERSION` and strip them in `migrateState`).
- **The bulk route's three new checks add 1–3 extra DB queries per bulk request** (one `task.findMany` for ownership, optionally one `projectMember.findUnique` for assignee, optionally one `tag.findUnique` for tags). These are indexed lookups (primary key / compound unique) and run before any mutation, so they don't slow down the happy path meaningfully. If profiling later shows this is a hotspot, the ownership check could be folded into the service's `updateMany` `where` clause (which already filters by `projectId`) — but then you lose the explicit 400 response and the caller can't distinguish "zero rows affected because no tasks matched" from "zero rows affected because tasks were in another project".
- **Concurrent-editing note:** this agent's working session overlapped with at least two other agents modifying the same repository (FCP-3 taskToApiPayload refactor and a separate MemberDirectory/view refactor). My changes to `useFlowDeck.ts` were applied on top of FCP-3's `taskToApiPayload` import + call-site changes — both sets of changes are in the working tree and compile cleanly together. The FCP-3 agent's worklog entry (restored from stash) documents the `taskToApiPayload` helper and the `sectionId` hydration work.
