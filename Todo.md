# Flowdek Product-Level Admin — TODO

> Source of truth for the internal Super Admin system.
> Previous work (email verification, password reset — commit `e2b5c6f`) is complete.

## 13. Product-level admin

Internal Flowdek Admin, separate from customer workspace admins.

**Do NOT confuse:**
- `Flowdeck Super Admin` (platform-level, sees everything)
- `Workspace OWNER` (tenant-level, sees one workspace)

Admin dashboard shows:
- Users, Workspaces, Active users, New registrations
- Disabled accounts, Storage usage, Failed logins
- Audit events, Feature usage, System health

---

## Phased implementation plan

### Phase 1 — Schema: add platformRole to User + migration
- [ ] Add `platformRole` field (SUPER_ADMIN | USER) to User model
- [ ] Generate + apply migration
- [ ] Seed: make wale.johnson a SUPER_ADMIN
- **Commit:** `feat(schema): add platform role for super admin`

### Phase 2 — Admin authorization + API endpoints
- [ ] `requireSuperAdmin()` helper in authorization.ts
- [ ] `src/server/admin/` service with metrics queries
- [ ] GET /api/admin/overview (users, workspaces, registrations, storage, feature usage)
- [ ] GET /api/admin/users (list all users with status, last login)
- [ ] GET /api/admin/workspaces (list all workspaces with member counts)
- [ ] GET /api/admin/audit (recent audit events)
- [ ] GET /api/admin/health (system health check)
- **Commit:** `feat(admin): add super admin API endpoints`

### Phase 3 — Admin dashboard page
- [ ] `/admin` route with admin layout
- [ ] Dashboard cards for each metric
- [ ] Tables for users, workspaces, audit log
- **Commit:** `feat(admin): add admin dashboard page`

---

## Progress log

| Phase | Commit | Status |
|-------|--------|--------|
| 1 | — | pending |
| 2 | — | pending |
| 3 | — | pending |
