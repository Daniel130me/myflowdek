# Flowdek Project Requirements

This checklist records what the product owner must provide or decide before each
part of Flowdek can be completed and verified. Secret values belong in
`.env.local` or the deployment platform's secret manager. Never paste them into
documentation or commit them to Git.

## Required now: Neon development database

- [ ] Neon project created near the intended application-hosting region.
- [ ] A `development` branch or database is available.
- [ ] Pooled Neon connection string placed in `DATABASE_URL` in `.env.local`.
- [ ] Direct Neon connection string placed in `DIRECT_URL` in `.env.local`.
- [ ] Confirmation that destructive demo seed data may run only in development.

The pooled hostname contains `-pooler`; the direct hostname does not. Supply
credentials through `.env.local`, not chat or Git.

Once available, connect the development database with:

```powershell
npm run db:generate
npm run db:migrate
npm test
npm run dev
```

## Required before authentication testing

- [ ] Public/local application URL.
- [ ] Securely generated `NEXTAUTH_SECRET`.
- [ ] `NEXTAUTH_URL` and `APP_BASE_URL` set to the same origin.
- [ ] SendGrid key or another transactional-email provider decision.
- [ ] Verified sender address and product email address.
- [ ] Decision on whether email verification is required before login.

The current local origin is `http://localhost:3004`.

## Required before connected-storage testing

### Shared

- [ ] A dedicated 32-byte `STORAGE_TOKEN_ENCRYPTION_KEY`.
- [ ] Final local, staging, and production callback origins.
- [ ] Approved file-size limits and blocked file types.

### Google Drive

- [ ] Google Cloud project and OAuth consent screen.
- [ ] OAuth test users.
- [ ] Client ID and client secret.
- [ ] Callback path: `/api/storage/oauth/google-drive/callback`.

### Microsoft OneDrive

- [ ] Microsoft Entra application registration.
- [ ] Supported account type: organization-only, or personal and work accounts.
- [ ] Client ID and client secret.
- [ ] Callback path: `/api/storage/oauth/onedrive/callback`.

### Dropbox

- [ ] Dropbox application with app-folder access.
- [ ] Client ID and client secret.
- [ ] Callback path: `/api/storage/oauth/dropbox/callback`.

Prefix every callback path with the exact origin. For example:

```text
http://localhost:3004/api/storage/oauth/google-drive/callback
```

Production OAuth applications must use the production HTTPS origin.

## Required before production deployment

- [ ] Next.js hosting provider and region.
- [ ] Production domain and DNS access.
- [ ] Neon paid plan and protected production branch.
- [ ] Production compute and scale-to-zero decision.
- [ ] Restore window, restore drill, and independent export schedule.
- [ ] Deployment secret manager.
- [ ] Error-monitoring provider.
- [ ] Product analytics and privacy decision.
- [ ] Redis and durable job-queue provider.
- [ ] Realtime-service hosting.
- [ ] Staging environment with separate database and provider credentials.
- [ ] Terms, privacy policy, and data-retention rules.

## Product decisions needed

- [ ] Workspace roles and exact capability matrix.
- [ ] Project guest behavior and external collaborator limits.
- [ ] Invitation expiry and resend policy.
- [ ] Whether one user may connect multiple accounts per storage provider.
- [ ] Behavior when a user deletes a provider file outside Flowdek.
- [ ] File retention when a project, task, user, or workspace is deleted.
- [ ] Free and paid product limits, if subscriptions are planned.
- [ ] Notification channels and preferences.
- [ ] Audit-log retention and workspace export requirements.
- [ ] First-release AI features and what user data AI providers may receive.

## Test accounts and acceptance input

- [ ] Two ordinary users in the same workspace.
- [ ] One workspace administrator.
- [ ] One invited external collaborator.
- [ ] Test Google Drive, OneDrive, and Dropbox accounts.
- [ ] Representative projects, tasks, files, comments, budgets, and timesheets.
- [ ] Expected results for main journeys and permission-denied cases.

## Inputs not required yet

Kubernetes, a dedicated API rewrite, read replicas, database partitioning, a search
cluster, a data warehouse, and multi-region deployment must not block the initial
database integration. They will be introduced only when measurements justify their
cost and complexity.
