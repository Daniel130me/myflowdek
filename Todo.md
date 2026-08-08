# Flowdek Task Backend, Sections, Activity, Comments — TODO

> Source of truth for the task-backend, sections, activity-history, and
> collaboration work. Each item is tracked from requirement → phase → commit.
>
> Previous work (foundation + workspace/invitation + project APIs + frontend
> wiring, commits up to `0bfc52c`) is complete.

## 5. Tasks — the biggest core domain

Basic CRUD (already partially done — extend with relationships + bulk):

```
GET    /api/projects/:projectId/tasks
POST   /api/projects/:projectId/tasks
GET    /api/projects/:projectId/tasks/:taskId
PATCH  /api/projects/:projectId/tasks/:taskId
DELETE /api/projects/:projectId/tasks/:taskId
```

Relationships to support:
- Assignee, Creator, Parent, Subtasks
- Dependencies (blocking/blocked-by)
- Tags, Section, Followers
- Comments, Files, Time logs

Bulk operations (use DB transactions):
- Bulk status, priority, assignment, due date
- Bulk delete, complete, move, tags

## 6. Sections + Tags + dependencies

Sections (project-level task grouping):
```
Project
 ├── Backlog
 ├── Phase 1
 ├── Design
 └── QA
```

Tags (already have basic CRUD — extend with task-tag management):
```
Design, Backend, Urgent, Customer Request, Bug
```

Dependencies (already have TaskDependency model — add API):
```
Design approved → Frontend implementation → QA → Deployment
```

## 7. Activity history

Record business events (separate from security AuditLog):
- Task created/assigned/completed/reopened
- Status/priority/due-date changed
- Comment added, file uploaded, member added

```
09:41  Oluwagbenga created this task
10:03  Ada was assigned
12:17  Status changed from Backlog → In Progress
14:42  Due date changed to 14 August
```

Two concepts:
- `AuditLog` → security/system activity (already exists)
- `ActivityEntry` → business/project activity (NEW)

## 8. Comments and collaboration

```
Task
 └── Comment
       ├── Reply
       ├── Reaction
       └── Mention
```

Implement: comments, replies, editing, deletion rules, @mentions, reactions,
task followers. Mentions → notifications (foundation only).

---

## Phased implementation plan

### Phase 1 — Schema: Sections, Followers, ActivityEntry, Comment replies/reactions
- [ ] Add `Section` model (id, projectId, name, position, collapsed)
- [ ] Add `sectionId` to Task
- [ ] Add `TaskFollower` model (taskId, userId)
- [ ] Add `ActivityEntry` model (id, taskId, projectId, type, description, authorId, meta, timestamp)
- [ ] Add `parentId` to Comment (replies), `editedAt`, `CommentReaction` model
- [ ] Generate + apply migration
- **Commit:** `feat(schema): add sections, followers, activity, comment replies/reactions`

### Phase 2 — Task relationships API (assignee, dependencies, tags, sections, followers)
- [ ] PATCH task to set assignee/section/parent
- [ ] POST/DELETE /api/tasks/:taskId/dependencies
- [ ] POST/DELETE /api/tasks/:taskId/tags
- [ ] POST/DELETE /api/tasks/:taskId/followers
- [ ] GET/POST/DELETE /api/projects/:projectId/sections
- **Commit:** `feat(tasks): add task relationships and sections APIs`

### Phase 3 — Bulk operations
- [ ] POST /api/projects/:projectId/tasks/bulk with typed actions
- [ ] All bulk ops in a single db.$transaction
- [ ] Actions: status, priority, assignee, dueDate, delete, complete, move, tags
- **Commit:** `feat(tasks): add bulk operations with transactions`

### Phase 4 — Activity history
- [ ] Activity service that records entries on task mutations
- [ ] Wire activity recording into task create/update/delete/assign
- [ ] GET /api/tasks/:taskId/activity
- **Commit:** `feat(activity): record and expose business activity history`

### Phase 5 — Comments collaboration (replies, reactions, mentions, edit)
- [ ] Extend comment service: replies, edit (editedAt), delete rules
- [ ] POST/DELETE /api/comments/:commentId/reactions
- [ ] @mention parsing + Mention model
- **Commit:** `feat(comments): add replies, reactions, mentions, and editing`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | `a7196bd` | ✅ done |
| 2 | `812719d` | ✅ done |
| 3 | `7a44ed6` | ✅ done |
| 4 | `d903ac4` | ✅ done |
| 5 | `8d3de75` | ✅ done |
