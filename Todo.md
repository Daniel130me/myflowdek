# Flowdek Notifications, R2 Files, Search — TODO

> Source of truth for the notification system, R2 file uploads, and search.
> Previous work (task backend, sections, activity, comments — commits up to
> `e14b873`) is complete.

## 9. Notification system

```
Notification
- id
- userId
- type
- actorId
- projectId
- taskId
- message
- readAt
- createdAt
```

Notify on:
- Task assigned, @mention, reply, due date approaching, overdue,
  invitation received, approval requested, status changed.

APIs:
```
GET   /api/notifications
PATCH /api/notifications/:id/read
POST  /api/notifications/read-all
```

## 10. Files + Cloudflare R2

Browser → ask Flowdek for signed URL → Flowdek verifies → signed R2 URL →
browser uploads directly to R2 → Flowdek stores metadata.

DB stores: name, size, MIME, R2 key, uploader, workspace, project, task, createdAt.
NOT the binary.

## 11. Search

Search across: Projects, Tasks, Comments, People, Files.
PostgreSQL full-text/trigram search + indexes. No Elasticsearch yet.

---

## Phased implementation plan

### Phase 1 — Notification schema + service + APIs
- [ ] Add `Notification` model to schema + migration
- [ ] `src/server/notifications/` service + constants
- [ ] GET /api/notifications, PATCH /api/notifications/:id/read, POST /api/notifications/read-all
- [ ] Wire notification creation into: task assignment, status change, comment reply, invitation accepted
- [ ] Lint + typecheck + curl tests
- **Commit:** `feat(notifications): add notification system with APIs`

### Phase 2 — File model upgrade + R2 signed uploads
- [ ] Extend `File` model: add `mimeType`, `r2Key`, `workspaceId`
- [ ] `src/server/files/r2.service.ts` — generate presigned URLs (S3 SDK)
- [ ] POST /api/projects/:projectId/files/presign — returns signed upload URL
- [ ] POST /api/projects/:projectId/files/confirm — stores metadata after upload
- [ ] GET /api/files/:fileId/download — generates a signed download URL
- [ ] Migration + lint + typecheck + tests
- **Commit:** `feat(files): add R2 signed upload and download`

### Phase 3 — Search
- [ ] Add PostgreSQL GIN trigram indexes (pg_trgm extension)
- [ ] `src/server/search/` service with trigram search across models
- [ ] GET /api/search?q=...&type=... — unified search endpoint
- [ ] Lint + typecheck + tests
- **Commit:** `feat(search): add PostgreSQL trigram search across models`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | `e9b159c` | ✅ done |
| 2 | `0763ecd` | ✅ done |
| 3 | `a43b4b4` | ✅ done |
