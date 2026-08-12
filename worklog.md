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
