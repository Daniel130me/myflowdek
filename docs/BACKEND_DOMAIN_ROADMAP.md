# Backend Domain Roadmap

> Documents which FlowDeck frontend domains still require backend persistence.
> The product foundation (auth, workspace, project, task, comment, file, RAID,
> time log) is already persisted in PostgreSQL. This roadmap covers the
> remaining domains so future schema work is deliberate, not ad hoc.
>
> Last updated: commit `0825efc`

## Already persisted (foundation)

| Domain | Model(s) | Status |
|--------|----------|--------|
| User / Auth | `User`, `VerificationToken`, `AuditLog` | ✅ Done |
| Workspace tenancy | `Workspace`, `WorkspaceMember` | ✅ Done |
| Projects | `Project`, `ProjectMember` | ✅ Done |
| Tasks | `Task`, `TaskDependency`, `Tag`, `TaskTag` | ✅ Done |
| Comments | `Comment` | ✅ Done |
| Files | `File` | ✅ Done |
| RAID | `RaidItem` | ✅ Done |
| Time logs | `TimeLog` | ✅ Done |
| Onboarding | `User.onboardedAt` + onboarding service | ✅ Done |

## Pending — requires schema + API

### 1. Sections
Task grouping within a project (collapsible sections in the task list).

- **Model**: `Section` (id, projectId, name, position, collapsed)
- **API**: CRUD under `/api/projects/[projectId]/sections`
- **Notes**: Already typed in `model/types.ts`. Needs a Prisma model + repository.

### 2. Activity feed
Per-task audit trail (status changes, assignee changes, completions).

- **Model**: `ActivityEntry` (id, taskId, type, description, authorId, timestamp)
- **API**: GET `/api/tasks/[taskId]/activity`
- **Notes**: Currently in-memory in the mock store. Should be generated from
  DB triggers or an event-sourcing pattern. Consider reusing `AuditLog` for
  task-level events.

### 3. Project status updates
Pinned status posts on the project dashboard (green/yellow/red).

- **Model**: `ProjectStatusUpdate` (id, projectId, authorId, text, color, createdAt)
- **API**: CRUD under `/api/projects/[projectId]/status-updates`

### 4. Goals & Key Results (OKR)
Org/workspace-level objectives with measurable key results.

- **Models**: `Goal` (id, workspaceId, title, status, startDate, endDate, parentId),
  `KeyResult` (id, goalId, title, targetValue, currentValue, unit)
- **API**: CRUD under `/api/goals` and `/api/goals/[goalId]/key-results`
- **Notes**: Goals can link to projects. Already typed in `model/types.ts`.

### 5. Saved filters
User-specific saved search filters for task views.

- **Model**: `SavedFilter` (id, userId, name, filters JSON, isPinned, createdAt)
- **API**: CRUD under `/api/users/me/saved-filters`
- **Notes**: Filters are user-scoped, not project-scoped.

### 6. Notifications
User notification feed (mentions, assignments, due dates, status changes).

- **Model**: `Notification` (id, userId, type, taskId, projectId, message,
  actorId, read, createdAt)
- **API**: GET/PATCH `/api/notifications`
- **Notes**: Should integrate with the real-time service (socket.io) for
  push delivery.

### 7. Automation rules
Trigger-action rules (e.g. "when status changes to done, notify assignee").

- **Model**: `AutomationRule` (id, projectId, name, enabled, trigger JSON,
  actions JSON, createdAt)
- **API**: CRUD under `/api/projects/[projectId]/automations`
- **Notes**: Execution engine is a separate concern — store the rule, run it
  via a background worker or webhook.

### 8. Forms & submissions
Intake forms that convert submissions into tasks.

- **Models**: `Form` (id, projectId, name, fields JSON, isActive),
  `FormSubmission` (id, formId, data JSON, submittedAt, convertedTaskId)
- **API**: CRUD under `/api/projects/[projectId]/forms`, public submit endpoint

### 9. Approvals
Approval requests linked to tasks (requester → approver workflow).

- **Model**: `ApprovalRequest` (id, taskId, projectId, requesterId, approverId,
  status, requestedAt, resolvedAt, comment)
- **API**: CRUD under `/api/projects/[projectId]/approvals`

### 10. Budgets & expenses
Project-level financial tracking.

- **Models**: `Budget` (id, projectId, name, totalBudget, spent, currency,
  startDate, endDate), `Expense` (id, budgetId, description, amount, category,
  date, createdBy)
- **API**: CRUD under `/api/projects/[projectId]/budgets` and
  `/api/budgets/[budgetId]/expenses`

### 11. Timesheets
Weekly timesheet entries for approval workflow.

- **Model**: `TimesheetEntry` (id, userId, projectId, taskId, date, hours,
  note, submitted, approved, createdAt)
- **API**: CRUD under `/api/timesheets`
- **Notes**: Distinct from `TimeLog` (which is raw time tracking). Timesheets
  are the approval-wrapped aggregate.

### 12. Comment reactions
Emoji reactions on comments.

- **Model**: `CommentReaction` (id, commentId, userId, emoji)
- **API**: POST/DELETE under `/api/comments/[commentId]/reactions`
- **Notes**: Unique constraint on (commentId, userId, emoji).

### 13. Task followers
Users following a task for notifications.

- **Model**: `TaskFollower` (taskId, userId)
- **API**: POST/DELETE under `/api/tasks/[taskId]/followers`
- **Notes**: Simple join table. Could be modeled as an array on Task, but a
  join table scales better and avoids JSON column queries.

### 14. Custom fields
Project-specific custom columns on tasks.

- **Models**: `CustomField` (id, projectId, key, label, type, options JSON),
  `TaskCustomFieldValue` (taskId, fieldId, value)
- **API**: CRUD under `/api/projects/[projectId]/custom-fields`
- **Notes**: Currently stored as a JSON map on the task in the mock store.
  Normalising to a separate table enables indexing and validation.

### 15. Task recurrence
Recurring task scheduling (daily/weekly/monthly).

- **Field**: Add `recurrence` String? to `Task` (already in the mock types)
- **API**: No new endpoint — handled in task update
- **Notes**: The execution engine (creating the next occurrence) is a
  background job, not an API.

### 16. Project / workspace preferences
User-specific view preferences per project (default view, sort, filters).

- **Model**: `UserProjectPreference` (userId, projectId, defaultView, sortConfig
  JSON, theme)
- **API**: GET/PUT under `/api/projects/[projectId]/preferences`
- **Notes**: Distinct from `ProjectMember` (which holds role + favorite).
  Could be merged into ProjectMember if the preference set stays small.

### 17. Invitations
Workspace/project invite flow (email-based, token-verified).

- **Model**: `Invitation` (id, workspaceId, email, role, token, invitedById,
  status, expiresAt)
- **API**: POST `/api/workspaces/[id]/invitations`, accept/decline endpoints
- **Notes**: Reuses the `VerificationToken` pattern. The onboarding flow
  collects invited emails but doesn't yet persist them (TODO in the service).

## Priority order for implementation

1. **Activity feed** — required for the task detail panel to show history
2. **Notifications** — required for the inbox view to be useful
3. **Project status updates** — required for the dashboard
4. **Sections** — required for the task list view grouping
5. **Goals & key results** — required for the goals view
6. **Saved filters** — quality-of-life for power users
7. **Custom fields** — required for project-specific workflows
8. **Task followers + comment reactions** — collaboration depth
9. **Approvals, budgets, timesheets, forms** — specialized views
10. **Automation rules** — power-user feature, lower priority

Each domain should follow the same pattern: Prisma model → migration →
repository → service → API route → wire the frontend store to the API.
